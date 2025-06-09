
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressFormData {
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  accountant_name: string;
  accountant_contact: string;
}

interface CompanyAddressFieldsProps {
  formData: AddressFormData;
  isAdmin: boolean;
  onInputChange: (field: string, value: string) => void;
}

export const CompanyAddressFields = ({ 
  formData, 
  isAdmin, 
  onInputChange 
}: CompanyAddressFieldsProps) => {
  return (
    <>
      {/* Endereço */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address" className="text-[#020817] dark:text-white font-extralight">
            Logradouro
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => onInputChange('address', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number" className="text-[#020817] dark:text-white font-extralight">
            Número
          </Label>
          <Input
            id="number"
            value={formData.number}
            onChange={(e) => onInputChange('number', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood" className="text-[#020817] dark:text-white font-extralight">
            Bairro
          </Label>
          <Input
            id="neighborhood"
            value={formData.neighborhood}
            onChange={(e) => onInputChange('neighborhood', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-[#020817] dark:text-white font-extralight">
            Cidade
          </Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => onInputChange('city', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state" className="text-[#020817] dark:text-white font-extralight">
            UF
          </Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => onInputChange('state', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postal_code" className="text-[#020817] dark:text-white font-extralight">
            CEP
          </Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => onInputChange('postal_code', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>
      </div>

      {/* Contador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="accountant_name" className="text-[#020817] dark:text-white font-extralight">
            Nome do Contador
          </Label>
          <Input
            id="accountant_name"
            value={formData.accountant_name}
            onChange={(e) => onInputChange('accountant_name', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountant_contact" className="text-[#020817] dark:text-white font-extralight">
            Contato do Contador
          </Label>
          <Input
            id="accountant_contact"
            value={formData.accountant_contact}
            onChange={(e) => onInputChange('accountant_contact', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            disabled={!isAdmin}
          />
        </div>
      </div>
    </>
  );
};
