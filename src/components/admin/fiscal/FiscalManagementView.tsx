import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Search, Save, Download, FileText } from "lucide-react";

interface Company {
  id: string;
  cnpj: string;
  company_name: string | null;
  trade_name?: string | null;
  address?: string | null;
  company_size?: string | null;
  certificate_data?: string | null;
  certificate_password?: string | null;
  created_at: string;
  updated_at: string;
  fiscal_automation_client?: boolean | null;
  receita_federal_api_key?: string | null;
  sefaz_api_key?: string | null;
}

export const FiscalManagementView = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    cnpj: "",
    company_name: "",
    trade_name: "",
    address: "",
    company_size: ""
  });

  // Certificate state
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateStatus, setCertificateStatus] = useState<"none" | "loaded" | "error">("none");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de empresas",
        variant: "destructive"
      });
    }
  };

  const searchCNPJData = async () => {
    if (!formData.cnpj) {
      toast({
        title: "Erro",
        description: "Digite um CNPJ para buscar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setStatusMessage("Buscando dados na Receita Federal...");

    try {
      // Chamar Edge Function para buscar dados da RF
      const { data, error } = await supabase.functions.invoke('search-cnpj', {
        body: { cnpj: formData.cnpj }
      });

      if (error) throw error;

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          company_name: data.data.company_name || "",
          trade_name: data.data.trade_name || "",
          address: data.data.address || "",
          company_size: data.data.company_size || ""
        }));
        setStatusMessage("Dados encontrados com sucesso!");
        toast({
          title: "Sucesso",
          description: "Dados da empresa encontrados na Receita Federal"
        });
      } else {
        throw new Error(data.message || "Erro ao buscar dados");
      }
    } catch (error) {
      console.error('Erro na busca CNPJ:', error);
      setStatusMessage("Erro ao buscar dados na Receita Federal");
      toast({
        title: "Erro",
        description: "Erro ao buscar dados na Receita Federal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async () => {
    if (!formData.cnpj || !formData.company_name) {
      toast({
        title: "Erro",
        description: "CNPJ e Razão Social são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const companyData = {
        cnpj: formData.cnpj,
        company_name: formData.company_name,
        trade_name: formData.trade_name || null,
        address: formData.address || null,
        company_size: formData.company_size || null,
        updated_at: new Date().toISOString()
      };

      // Verificar se empresa já existe
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('cnpj', formData.cnpj)
        .single();

      let result;
      if (existingCompany) {
        // Atualizar empresa existente
        result = await supabase
          .from('companies')
          .update(companyData)
          .eq('cnpj', formData.cnpj)
          .select()
          .single();
      } else {
        // Criar nova empresa
        result = await supabase
          .from('companies')
          .insert(companyData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setSelectedCompany(result.data);
      await fetchCompanies();
      toast({
        title: "Sucesso",
        description: "Empresa salva com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar empresa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      cnpj: company.cnpj,
      company_name: company.company_name || "",
      trade_name: company.trade_name || "",
      address: company.address || "",
      company_size: company.company_size || ""
    });
    setCertificateStatus(company.certificate_data ? "loaded" : "none");
  };

  const uploadCertificate = async () => {
    if (!selectedCompany || !certificateFile || !certificatePassword) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa, arquivo .pfx e digite a senha",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        // Chamar Edge Function para criptografar e salvar certificado
        const { data, error } = await supabase.functions.invoke('upload-certificate', {
          body: {
            companyId: selectedCompany.id,
            certificateData: base64Data,
            password: certificatePassword
          }
        });

        if (error) throw error;

        if (data.success) {
          setCertificateStatus("loaded");
          setCertificateFile(null);
          setCertificatePassword("");
          toast({
            title: "Sucesso",
            description: "Certificado salvo com sucesso"
          });
        } else {
          throw new Error(data.message || "Erro ao salvar certificado");
        }
      };

      reader.onerror = () => {
        throw new Error("Erro ao ler arquivo");
      };

      reader.readAsDataURL(certificateFile);
    } catch (error) {
      console.error('Erro ao fazer upload do certificado:', error);
      setCertificateStatus("error");
      toast({
        title: "Erro",
        description: "Erro ao salvar certificado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (type: 'purchase' | 'sale') => {
    if (!selectedCompany || certificateStatus !== "loaded") {
      toast({
        title: "Erro",
        description: "Selecione uma empresa com certificado válido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setStatusMessage(`Buscando notas de ${type === 'purchase' ? 'compra' : 'venda'}...`);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-fiscal-notes', {
        body: {
          companyId: selectedCompany.id,
          cnpj: selectedCompany.cnpj,
          type
        }
      });

      if (error) throw error;

      if (data.success) {
        setStatusMessage(`Notas encontradas: ${data.count || 0}`);
        toast({
          title: "Sucesso",
          description: `${data.count || 0} notas fiscais encontradas`
        });
      } else {
        throw new Error(data.message || "Erro ao buscar notas");
      }
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      setStatusMessage("Erro na comunicação com SEFAZ");
      toast({
        title: "Erro",
        description: "Erro ao buscar notas fiscais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Gestão Fiscal</h1>
      </div>

      {/* Formulário de Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastro/Edição de Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchCNPJData}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar Dados da Receita Federal
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Razão Social</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Razão Social da empresa"
              />
            </div>
            <div>
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData(prev => ({ ...prev, trade_name: e.target.value }))}
                placeholder="Nome Fantasia"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Endereço Completo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Endereço completo da empresa"
            />
          </div>

          <div>
            <Label htmlFor="company_size">Porte da Empresa</Label>
            <Select value={formData.company_size} onValueChange={(value) => setFormData(prev => ({ ...prev, company_size: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o porte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEI">MEI</SelectItem>
                <SelectItem value="Microempresa">Microempresa</SelectItem>
                <SelectItem value="Pequeno Porte">Pequeno Porte</SelectItem>
                <SelectItem value="Médio Porte">Médio Porte</SelectItem>
                <SelectItem value="Grande Porte">Grande Porte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={saveCompany} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Empresa
          </Button>
        </CardContent>
      </Card>

      {/* Seletor de Empresa Existente */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => {
            const company = companies.find(c => c.id === value);
            if (company) selectCompany(company);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma empresa existente" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.company_name} - {company.cnpj}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Seção de Certificado Digital */}
      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Certificado Digital - {selectedCompany.company_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={certificateStatus === "loaded" ? "default" : certificateStatus === "error" ? "destructive" : "secondary"}>
                {certificateStatus === "loaded" ? "Certificado Carregado" : 
                 certificateStatus === "error" ? "Erro no Upload" : "Nenhum Certificado"}
              </Badge>
            </div>

            <div>
              <Label htmlFor="certificate">Arquivo .pfx (Certificado A1)</Label>
              <Input
                id="certificate"
                type="file"
                accept=".pfx"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <Label htmlFor="cert_password">Senha do Certificado</Label>
              <Input
                id="cert_password"
                type="password"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                placeholder="Digite a senha do certificado"
              />
            </div>

            <Button onClick={uploadCertificate} disabled={loading || !certificateFile || !certificatePassword}>
              <Upload className="h-4 w-4 mr-2" />
              Salvar Certificado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Botões para Puxar Notas Fiscais */}
      {selectedCompany && certificateStatus === "loaded" && (
        <Card>
          <CardHeader>
            <CardTitle>Sincronização de Notas Fiscais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={() => fetchNotes('purchase')}
                disabled={loading}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Puxar Notas de Compra
              </Button>
              <Button 
                onClick={() => fetchNotes('sale')}
                disabled={loading}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Puxar Notas de Venda
              </Button>
            </div>

            {statusMessage && (
              <Alert>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};