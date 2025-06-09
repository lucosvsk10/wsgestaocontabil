
import { useToast } from "@/hooks/use-toast";
import { useReceiptaFederalAPI } from "@/hooks/company/useReceiptaFederalAPI";
import { CompanyFormData } from "./hooks/useCompanyData";

interface CompanyImportHandlerProps {
  formData: CompanyFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompanyFormData>>;
}

export const useCompanyImport = ({ formData, setFormData }: CompanyImportHandlerProps) => {
  const { toast } = useToast();
  const { fetchCompanyData, loading: rfLoading } = useReceiptaFederalAPI();

  const handleImportFromRF = async () => {
    if (!formData.cnpj) {
      toast({
        title: "CNPJ obrigatório",
        description: "Digite um CNPJ para importar os dados",
        variant: "destructive"
      });
      return;
    }

    const rfData = await fetchCompanyData(formData.cnpj);
    if (!rfData) return;

    setFormData(prev => ({
      ...prev,
      name: rfData.nome || prev.name,
      fantasy_name: rfData.fantasia || prev.fantasy_name,
      cadastral_situation: rfData.situacao || prev.cadastral_situation,
      opening_date: rfData.abertura || prev.opening_date,
      social_capital: rfData.capital_social || prev.social_capital,
      main_activity: rfData.atividade_principal?.[0]?.text || prev.main_activity,
      secondary_activities: rfData.atividades_secundarias?.map(a => a.text).join('; ') || prev.secondary_activities,
      address: rfData.logradouro || prev.address,
      number: rfData.numero || prev.number,
      neighborhood: rfData.bairro || prev.neighborhood,
      city: rfData.municipio || prev.city,
      state: rfData.uf || prev.state,
      postal_code: rfData.cep || prev.postal_code,
      phone: rfData.telefone || prev.phone,
      email: rfData.email || prev.email,
      last_federal_update: new Date().toISOString()
    }));
  };

  return {
    handleImportFromRF,
    rfLoading
  };
};
