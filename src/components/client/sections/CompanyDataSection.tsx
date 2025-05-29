
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, User, Phone, Mail, MapPin } from 'lucide-react';
import { CompanyData } from '@/types/client';
import { useClientData } from '@/hooks/client/useClientData';

export const CompanyDataSection = () => {
  const { companyData, fetchCompanyData } = useClientData();

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!companyData) {
    return (
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
      <CardHeader>
        <CardTitle className="flex items-center text-[#020817] dark:text-[#efc349] font-extralight text-xl">
          <Building className="mr-2 h-5 w-5" />
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Razão Social</label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.name}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">CNPJ</label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.cnpj}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Data de Abertura</label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {formatDate(companyData.opening_date)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Regime Tributário</label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.tax_regime}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight flex items-center">
                <User className="w-4 h-4 mr-1" />
                Contador Responsável
              </label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.accountant_name}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Contato do Contador
              </label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.accountant_contact}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                E-mail
              </label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.email}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Endereço
              </label>
              <p className="text-[#020817] dark:text-white font-extralight">
                {companyData.address}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
