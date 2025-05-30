
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, MapPin, Phone, Mail, User, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/client/useClientData';
import { Badge } from '@/components/ui/badge';

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
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (!companyData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
            Dados da Empresa
          </h2>
        </div>

        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400 font-extralight mb-2">
              Dados da empresa não encontrados
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Entre em contato com seu contador para atualizar os dados
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Dados da Empresa
        </h2>
        <Badge variant="outline" className="font-extralight">
          Atualizado
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Informações principais da empresa */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              <div className="p-2 rounded-lg bg-[#efc349]/10">
                <Building className="w-5 h-5 text-[#efc349]" />
              </div>
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Razão Social</span>
                <p className="font-extralight text-[#020817] dark:text-white text-lg">
                  {companyData.name}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">CNPJ</span>
                <p className="font-extralight text-[#020817] dark:text-white text-lg">
                  {formatCNPJ(companyData.cnpj)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Data de Abertura</span>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {formatDate(companyData.opening_date)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Regime Tributário</span>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {companyData.tax_regime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato da empresa */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              <div className="p-2 rounded-lg bg-[#efc349]/10">
                <Phone className="w-5 h-5 text-[#efc349]" />
              </div>
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Endereço</span>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {companyData.address}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Telefone</span>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {companyData.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">E-mail</span>
                <p className="font-extralight text-[#020817] dark:text-white">
                  {companyData.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contador responsável */}
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              <div className="p-2 rounded-lg bg-[#efc349]/10">
                <User className="w-5 h-5 text-[#efc349]" />
              </div>
              Contador Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Nome</span>
              <p className="font-extralight text-[#020817] dark:text-white text-lg">
                {companyData.accountant_name}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-extralight">Contato</span>
              <p className="font-extralight text-[#020817] dark:text-white">
                {companyData.accountant_contact}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
