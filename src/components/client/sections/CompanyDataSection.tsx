
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Calendar, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface CompanyData {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  opening_date: string;
  tax_regime: string;
  accountant_name: string;
  accountant_contact: string;
}

export const CompanyDataSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanyData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }
      
      setCompanyData(data);
    } catch (error: any) {
      console.error('Erro ao buscar dados da empresa:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [user?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
        <CardContent className="py-12 text-center">
          <Building className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400 font-extralight mb-2">
            Dados da empresa não encontrados
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
            Entre em contato com seu contador para cadastrar os dados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Dados da Empresa
        </h2>
        <Badge variant="outline" className="font-extralight text-green-600 border-green-200">
          Ativo
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Informações Básicas */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Building className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-extralight text-[#020817] dark:text-white mb-4">
                  {companyData.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">CNPJ:</span>
                    <span className="font-extralight text-[#020817] dark:text-white">
                      {formatCNPJ(companyData.cnpj)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Abertura:</span>
                    <span className="font-extralight text-[#020817] dark:text-white">
                      {formatDate(companyData.opening_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-extralight">
                      {companyData.tax_regime}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Email:</span>
                  <span className="font-extralight text-[#020817] dark:text-white">
                    {companyData.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Telefone:</span>
                  <span className="font-extralight text-[#020817] dark:text-white">
                    {formatPhone(companyData.phone)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Endereço:</span>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {companyData.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Contábeis */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Responsável Contábil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight mb-1">
                  Contador Responsável
                </p>
                <p className="font-extralight text-[#020817] dark:text-white text-lg">
                  {companyData.accountant_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight mb-1">
                  Contato
                </p>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {companyData.accountant_contact}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
