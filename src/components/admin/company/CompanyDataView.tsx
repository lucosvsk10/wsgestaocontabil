
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Save, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
      
      // Recarregar dados para pegar o ID se foi uma inserção
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
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Building className="h-8 w-8 text-[#020817] dark:text-[#efc349]" />
          <div>
            <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349]">
              Dados da Empresa
            </h1>
            <p className="text-gray-600 dark:text-white/70 font-extralight">
              Gerencie as informações da empresa do cliente
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#020817] dark:text-white font-extralight">
                Razão Social
              </Label>
              <Input
                id="name"
                value={companyData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite a razão social"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-[#020817] dark:text-white font-extralight">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                value={companyData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#020817] dark:text-white font-extralight">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={companyData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="empresa@email.com"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#020817] dark:text-white font-extralight">
                Telefone
              </Label>
              <Input
                id="phone"
                value={companyData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-[#020817] dark:text-white font-extralight">
                Endereço
              </Label>
              <Input
                id="address"
                value={companyData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_date" className="text-[#020817] dark:text-white font-extralight">
                Data de Abertura
              </Label>
              <Input
                id="opening_date"
                type="date"
                value={companyData.opening_date}
                onChange={(e) => handleInputChange('opening_date', e.target.value)}
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_regime" className="text-[#020817] dark:text-white font-extralight">
                Regime Tributário
              </Label>
              <Select
                value={companyData.tax_regime}
                onValueChange={(value) => handleInputChange('tax_regime', value)}
              >
                <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  <SelectItem value="mei">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountant_name" className="text-[#020817] dark:text-white font-extralight">
                Nome do Contador
              </Label>
              <Input
                id="accountant_name"
                value={companyData.accountant_name}
                onChange={(e) => handleInputChange('accountant_name', e.target.value)}
                placeholder="Nome do contador responsável"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountant_contact" className="text-[#020817] dark:text-white font-extralight">
                Contato do Contador
              </Label>
              <Input
                id="accountant_contact"
                value={companyData.accountant_contact}
                onChange={(e) => handleInputChange('accountant_contact', e.target.value)}
                placeholder="Email ou telefone do contador"
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Dados
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
