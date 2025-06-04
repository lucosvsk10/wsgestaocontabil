
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyDataHeader } from './CompanyDataHeader';
import { CompanyDataForm } from './CompanyDataForm';
import { CompanyDataActions } from './CompanyDataActions';

interface CompanyData {
  id?: string;
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

interface CompanyDataViewProps {
  userId: string;
}

export const CompanyDataView: React.FC<CompanyDataViewProps> = ({ userId }) => {
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    opening_date: '',
    tax_regime: '',
    accountant_name: '',
    accountant_contact: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyData();
  }, [userId]);

  const fetchCompanyData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setCompanyData({
          id: data.id,
          name: data.name || '',
          cnpj: data.cnpj || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          opening_date: data.opening_date || '',
          tax_regime: data.tax_regime || '',
          accountant_name: data.accountant_name || '',
          accountant_contact: data.accountant_contact || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const dataToSave = {
        user_id: userId,
        name: companyData.name,
        cnpj: companyData.cnpj,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        opening_date: companyData.opening_date,
        tax_regime: companyData.tax_regime,
        accountant_name: companyData.accountant_name,
        accountant_contact: companyData.accountant_contact,
        updated_at: new Date().toISOString()
      };

      let result;
      if (companyData.id) {
        result = await supabase
          .from('company_data')
          .update(dataToSave)
          .eq('id', companyData.id);
      } else {
        result = await supabase
          .from('company_data')
          .insert(dataToSave);
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: "Sucesso",
        description: "Dados da empresa salvos com sucesso!"
      });
      
      if (!companyData.id) {
        await fetchCompanyData();
      }
    } catch (error) {
      console.error('Erro ao salvar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <CompanyDataHeader />

      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CompanyDataForm 
            companyData={companyData}
            onInputChange={handleInputChange}
          />
          <CompanyDataActions 
            onSave={handleSave}
            isSaving={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
};
