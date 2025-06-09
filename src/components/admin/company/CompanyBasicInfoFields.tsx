
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormData {
  cnpj: string;
  name: string;
  fantasy_name: string;
  cadastral_situation: string;
  opening_date: string;
  social_capital: string;
  tax_regime: string;
  phone: string;
  email: string;
}

interface CompanyBasicInfoFieldsProps {
  formData: FormData;
  isAdmin: boolean;
  onInputChange: (field: string, value: string) => void;
}

export const CompanyBasicInfoFields = ({ 
  formData, 
  isAdmin, 
  onInputChange 
}: CompanyBasicInfoFieldsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="cnpj" className="text-[#020817] dark:text-white font-extralight">
          CNPJ *
        </Label>
        <Input
          id="cnpj"
          value={formData.cnpj}
          onChange={(e) => onInputChange('cnpj', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-[#020817] dark:text-white font-extralight">
          Razão Social
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fantasy_name" className="text-[#020817] dark:text-white font-extralight">
          Nome Fantasia
        </Label>
        <Input
          id="fantasy_name"
          value={formData.fantasy_name}
          onChange={(e) => onInputChange('fantasy_name', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cadastral_situation" className="text-[#020817] dark:text-white font-extralight">
          Situação Cadastral
        </Label>
        <Input
          id="cadastral_situation"
          value={formData.cadastral_situation}
          onChange={(e) => onInputChange('cadastral_situation', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="opening_date" className="text-[#020817] dark:text-white font-extralight">
          Data de Abertura
        </Label>
        <Input
          id="opening_date"
          type="date"
          value={formData.opening_date}
          onChange={(e) => onInputChange('opening_date', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="social_capital" className="text-[#020817] dark:text-white font-extralight">
          Capital Social
        </Label>
        <Input
          id="social_capital"
          value={formData.social_capital}
          onChange={(e) => onInputChange('social_capital', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_regime" className="text-[#020817] dark:text-white font-extralight">
          Regime Tributário
        </Label>
        <Input
          id="tax_regime"
          value={formData.tax_regime}
          onChange={(e) => onInputChange('tax_regime', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-[#020817] dark:text-white font-extralight">
          Telefone
        </Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => onInputChange('phone', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#020817] dark:text-white font-extralight">
          E-mail
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>
    </div>
  );
};
