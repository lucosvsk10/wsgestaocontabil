
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface CompanyDataFormProps {
  companyData: CompanyData;
  onInputChange: (field: keyof CompanyData, value: string) => void;
}

export const CompanyDataForm: React.FC<CompanyDataFormProps> = ({
  companyData,
  onInputChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-[#020817] dark:text-white font-extralight">
          Razão Social
        </Label>
        <Input
          id="name"
          value={companyData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
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
          onChange={(e) => onInputChange('cnpj', e.target.value)}
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
          onChange={(e) => onInputChange('email', e.target.value)}
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
          onChange={(e) => onInputChange('phone', e.target.value)}
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
          onChange={(e) => onInputChange('address', e.target.value)}
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
          onChange={(e) => onInputChange('opening_date', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_regime" className="text-[#020817] dark:text-white font-extralight">
          Regime Tributário
        </Label>
        <Select
          value={companyData.tax_regime}
          onValueChange={(value) => onInputChange('tax_regime', value)}
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
          onChange={(e) => onInputChange('accountant_name', e.target.value)}
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
          onChange={(e) => onInputChange('accountant_contact', e.target.value)}
          placeholder="Email ou telefone do contador"
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
        />
      </div>
    </div>
  );
};
