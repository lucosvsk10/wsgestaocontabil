
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Shield, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Certificate {
  id: string;
  certificate_name: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export const FiscalCertificateManager = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [certificatePassword, setCertificatePassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userData } = useAuth();

  React.useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fiscal_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar certificados digitais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pfx')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo .pfx válido",
        variant: "destructive"
      });
      return;
    }

    if (!certificatePassword) {
      toast({
        title: "Erro",
        description: "Por favor, informe a senha do certificado",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadProgress(true);
      
      // Converter arquivo para base64
      const fileBuffer = await file.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // Chamar edge function para processar e armazenar o certificado
      const { data, error } = await supabase.functions.invoke('upload-certificate', {
        body: {
          certificateData: base64Data,
          password: certificatePassword,
          fileName: file.name
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Certificado digital carregado com sucesso"
      });

      setCertificatePassword('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchCertificates();

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar certificado digital",
        variant: "destructive"
      });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteCertificate = async (certificateId: string) => {
    if (!confirm('Tem certeza que deseja remover este certificado?')) return;

    try {
      const { error } = await supabase
        .from('fiscal_certificates')
        .delete()
        .eq('id', certificateId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Certificado removido com sucesso"
      });

      await fetchCertificates();
    } catch (error: any) {
      console.error('Erro ao remover certificado:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover certificado",
        variant: "destructive"
      });
    }
  };

  const getCertificateStatus = (cert: Certificate) => {
    const now = new Date();
    const validUntil = new Date(cert.valid_until);
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!cert.is_active) {
      return { status: 'Inativo', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    } else if (daysUntilExpiry < 0) {
      return { status: 'Expirado', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'Expira em breve', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    } else {
      return { status: 'Ativo', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-navy dark:text-white">
          Certificados Digitais
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os certificados digitais para automação fiscal
        </p>
      </div>

      {/* Upload de Certificado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carregar Novo Certificado
          </CardTitle>
          <CardDescription>
            Faça upload de um certificado digital A1 (.pfx) para habilitar a automação fiscal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Seus certificados são armazenados de forma criptografada e segura. Apenas você e os administradores têm acesso.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="certificate-file">Arquivo .pfx</Label>
              <Input
                id="certificate-file"
                type="file"
                accept=".pfx,.p12"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={uploadProgress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-password">Senha do Certificado</Label>
              <Input
                id="certificate-password"
                type="password"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                placeholder="Digite a senha do certificado"
                disabled={uploadProgress}
              />
            </div>
          </div>

          {uploadProgress && (
            <div className="text-sm text-blue-600">
              Processando certificado...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Certificados */}
      <Card>
        <CardHeader>
          <CardTitle>Certificados Cadastrados</CardTitle>
          <CardDescription>
            Lista de certificados digitais disponíveis para uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
            </div>
          ) : certificates.length > 0 ? (
            <div className="space-y-4">
              {certificates.map((cert) => {
                const statusInfo = getCertificateStatus(cert);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">{cert.certificate_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Válido de {new Date(cert.valid_from).toLocaleDateString('pt-BR')} até {' '}
                          {new Date(cert.valid_until).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCertificate(cert.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum certificado digital cadastrado</p>
              <p className="text-sm">Faça upload de um certificado .pfx para começar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
