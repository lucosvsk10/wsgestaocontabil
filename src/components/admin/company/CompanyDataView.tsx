
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, Save, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReceiptaFederalAPI } from "@/hooks/company/useReceiptaFederalAPI";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";

export const CompanyDataView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
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
            <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center justify-between">
              <div className="flex items-center">
                <Building2 className="w-6 h-6 mr-2" />
                Informações da Empresa
              </div>
              {isAdmin && (
                <Button
                  onClick={handleImportFromRF}
                  disabled={rfLoading || !formData.cnpj}
                  variant="outline"
                  className="border-[#efc349]/30 hover:bg-[#efc349]/10"
                >
                  {rfLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Importar dados da RF
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-[#020817] dark:text-white font-extralight">
                  CNPJ *
                </Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
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
                  onChange={(e) => handleInputChange('name', e.target.value)}
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
                  onChange={(e) => handleInputChange('fantasy_name', e.target.value)}
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
                  onChange={(e) => handleInputChange('cadastral_situation', e.target.value)}
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
                  onChange={(e) => handleInputChange('opening_date', e.target.value)}
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
                  onChange={(e) => handleInputChange('social_capital', e.target.value)}
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
                  onChange={(e) => handleInputChange('tax_regime', e.target.value)}
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
                  onChange={(e) => handleInputChange('phone', e.target.value)}
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Atividades */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="main_activity" className="text-[#020817] dark:text-white font-extralight">
                  Atividade Principal
                </Label>
                <Input
                  id="main_activity"
                  value={formData.main_activity}
                  onChange={(e) => handleInputChange('main_activity', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_activities" className="text-[#020817] dark:text-white font-extralight">
                  Atividades Secundárias
                </Label>
                <Textarea
                  id="secondary_activities"
                  value={formData.secondary_activities}
                  onChange={(e) => handleInputChange('secondary_activities', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-[#020817] dark:text-white font-extralight">
                  Logradouro
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
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
                  onChange={(e) => handleInputChange('number', e.target.value)}
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
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
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
                  onChange={(e) => handleInputChange('city', e.target.value)}
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
                  onChange={(e) => handleInputChange('state', e.target.value)}
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
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
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
                  onChange={(e) => handleInputChange('accountant_name', e.target.value)}
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
                  onChange={(e) => handleInputChange('accountant_contact', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Campos Administrativos - Apenas para Admin */}
            {isAdmin && (
              <div className="border-t pt-6 space-y-6">
                <h3 className="text-[#020817] dark:text-[#efc349] font-medium">Informações Administrativas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="client_status" className="text-[#020817] dark:text-white font-extralight">
                      Status do Cliente
                    </Label>
                    <Input
                      id="client_status"
                      value={formData.client_status}
                      onChange={(e) => handleInputChange('client_status', e.target.value)}
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internal_responsible" className="text-[#020817] dark:text-white font-extralight">
                      Responsável Interno
                    </Label>
                    <Input
                      id="internal_responsible"
                      value={formData.internal_responsible}
                      onChange={(e) => handleInputChange('internal_responsible', e.target.value)}
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internal_tags" className="text-[#020817] dark:text-white font-extralight">
                      Tags Internas (separadas por vírgula)
                    </Label>
                    <Input
                      id="internal_tags"
                      value={formData.internal_tags}
                      onChange={(e) => handleInputChange('internal_tags', e.target.value)}
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_observations" className="text-[#020817] dark:text-white font-extralight">
                    Observações Internas
                  </Label>
                  <Textarea
                    id="internal_observations"
                    value={formData.internal_observations}
                    onChange={(e) => handleInputChange('internal_observations', e.target.value)}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                    rows={4}
                  />
                </div>
              </div>
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
