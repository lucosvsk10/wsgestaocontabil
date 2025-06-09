
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReceiptaFederalAPI } from "@/hooks/company/useReceiptaFederalAPI";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import { CompanyDataHeader } from "./CompanyDataHeader";
import { CompanyBasicInfoFields } from "./CompanyBasicInfoFields";
import { CompanyActivityFields } from "./CompanyActivityFields";
import { CompanyAddressFields } from "./CompanyAddressFields";
import { CompanyAdminFields } from "./CompanyAdminFields";

export const CompanyDataView = () => {
  const { userId } = useParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { fetchCompanyData, loading: rfLoading } = useReceiptaFederalAPI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    opening_date: "",
    tax_regime: "",
    phone: "",
    email: "",
    address: "",
    accountant_name: "",
    accountant_contact: "",
    // Novos campos da RF
    fantasy_name: "",
    cadastral_situation: "",
    social_capital: "",
    main_activity: "",
    secondary_activities: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    // Campos administrativos
    registration_status: "",
    last_federal_update: "",
    last_query_date: "",
    internal_tags: "",
    client_status: "",
    internal_observations: "",
    internal_responsible: ""
  });

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchCompanyDataFromDB();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserData(data);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  const fetchCompanyDataFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        setLoading(false);
        return;
      }

      if (data) {
        setFormData({
          name: data.name || "",
          cnpj: data.cnpj || "",
          opening_date: data.opening_date || "",
          tax_regime: data.tax_regime || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          accountant_name: data.accountant_name || "",
          accountant_contact: data.accountant_contact || "",
          fantasy_name: data.fantasy_name || "",
          cadastral_situation: data.cadastral_situation || "",
          social_capital: data.social_capital || "",
          main_activity: data.main_activity || "",
          secondary_activities: data.secondary_activities || "",
          number: data.number || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          registration_status: data.registration_status || "",
          last_federal_update: data.last_federal_update || "",
          last_query_date: data.last_query_date || "",
          internal_tags: Array.isArray(data.internal_tags) ? data.internal_tags.join(', ') : "",
          client_status: data.client_status || "",
          internal_observations: data.internal_observations || "",
          internal_responsible: data.internal_responsible || ""
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

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

    // Mapear dados da RF para o formulário
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

  const handleSave = async () => {
    if (!userId || !isAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_data')
        .upsert({
          user_id: userId,
          ...formData,
          internal_tags: formData.internal_tags ? formData.internal_tags.split(',').map(tag => tag.trim()) : []
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados da empresa salvos com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (!isAdmin) return; // Apenas admin pode editar
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
        <SimpleNavbar title="Dados da Empresa" />
        <div className="pt-20 flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
            <p className="text-[#020817] dark:text-white font-extralight">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <SimpleNavbar title="Dados da Empresa" />
      
      <div className="pt-20 space-y-8 p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl text-[#020817] dark:text-[#efc349] font-extralight">
              Dados da Empresa
            </h1>
            <p className="text-gray-600 dark:text-white/70 font-extralight">
              {userData?.name || userData?.email || 'Usuário'}
              {!isAdmin && <span className="ml-2 text-amber-600">(Apenas visualização)</span>}
            </p>
          </div>
        </div>

        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle>
              <CompanyDataHeader
                isAdmin={isAdmin}
                cnpj={formData.cnpj}
                rfLoading={rfLoading}
                onImportFromRF={handleImportFromRF}
              />
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informações Básicas */}
            <CompanyBasicInfoFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={handleInputChange}
            />

            {/* Atividades */}
            <CompanyActivityFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={handleInputChange}
            />

            {/* Endereço */}
            <CompanyAddressFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={handleInputChange}
            />

            {/* Campos Administrativos - Apenas para Admin */}
            {isAdmin && (
              <CompanyAdminFields
                formData={formData}
                onInputChange={handleInputChange}
              />
            )}

            {isAdmin && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
