
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, MapPin, Phone, Mail, FileText, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/client/useClientData';

export const CompanyDataSection = () => {
  const { user } = useAuth();
  const { companyData, fetchCompanyData } = useClientData();

  useEffect(() => {
    if (user?.id) {
      fetchCompanyData();
    }
  }, [user?.id, fetchCompanyData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (!companyData) {
    return (
      <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
        <CardContent className="py-12 text-center">
          <Building className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400 font-extralight">
            Carregando dados da empresa...
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Building className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Razão Social</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">CNPJ</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {formatCNPJ(companyData.cnpj)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Data de Abertura</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {formatDate(companyData.opening_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Regime Tributário</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.tax_regime}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados de Contato */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Endereço
              </p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.address}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight flex items-center gap-1">
                <Phone className="w-4 h-4" />
                Telefone
              </p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.phone}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight flex items-center gap-1">
                <Mail className="w-4 h-4" />
                E-mail
              </p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contador Responsável */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <User className="w-5 h-5" />
              Contador Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Nome</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.accountant_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Contato</p>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.accountant_contact}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
