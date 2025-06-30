
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FiscalCertificate {
  id: string;
  company_id: string;
  certificate_name: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export const useFiscalCertificates = () => {
  const [certificates, setCertificates] = useState<FiscalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();
  const { toast } = useToast();

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('fiscal_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCertificates(data || []);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  const uploadCertificate = async (file: File, password: string) => {
    try {
      setLoading(true);

      // Converter arquivo para base64
      const fileBuffer = await file.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke('upload-certificate', {
        body: {
          certificateData: base64Data,
          password: password,
          fileName: file.name
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Certificado digital carregado com sucesso"
      });

      // Recarregar certificados
      await fetchCertificates();

      return data;
    } catch (err) {
      console.error('Error uploading certificate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar certificado';
      setError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCertificate = async (certificateId: string) => {
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

      // Recarregar certificados
      await fetchCertificates();
    } catch (err) {
      console.error('Error deleting certificate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover certificado';
      setError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    }
  };

  const getActiveCertificate = () => {
    return certificates.find(cert => cert.is_active);
  };

  const getCertificateStatus = (certificate: FiscalCertificate) => {
    const now = new Date();
    const validUntil = new Date(certificate.valid_until);
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!certificate.is_active) {
      return { status: 'Inativo', type: 'inactive' as const };
    } else if (daysUntilExpiry < 0) {
      return { status: 'Expirado', type: 'expired' as const };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'Expira em breve', type: 'expiring' as const };
    } else {
      return { status: 'Ativo', type: 'active' as const };
    }
  };

  useEffect(() => {
    if (userData) {
      fetchCertificates();
    }
  }, [userData]);

  return {
    certificates,
    loading,
    error,
    fetchCertificates,
    uploadCertificate,
    deleteCertificate,
    getActiveCertificate,
    getCertificateStatus
  };
};
