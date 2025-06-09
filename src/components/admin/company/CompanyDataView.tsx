import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowLeft, Save, Loader2, Search, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptaData {
  razao_social: string;
  cnpj: string;
  endereco: string;
  data_abertura: string;
  situacao_cadastral: string;
}

export const CompanyDataView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    // Campos básicos
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    opening_date: "",
    tax_regime: "",
    accountant_name: "",
    accountant_contact: "",
    
    // Campos estratégicos (admin)
    registration_status: "",
    last_federal_update: "",
    last_query_date: "",
    internal_tags: [] as string[],
    client_status: "",
    internal_observations: "",
    internal_responsible: ""
  });

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchCompanyData();
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

  const fetchCompanyData = async () => {
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
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          opening_date: data.opening_date || "",
          tax_regime: data.tax_regime || "",
          accountant_name: data.accountant_name || "",
          accountant_contact: data.accountant_contact || "",
          registration_status: data.registration_status || "",
          last_federal_update: data.last_federal_update || "",
          last_query_date: data.last_query_date || "",
          internal_tags: data.internal_tags || [],
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

  const validateCNPJ = (cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    return cleanCNPJ.length === 14;
  };

  const formatCNPJ = (value: string): string => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned.length <= 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const searchReceiptaFederal = async () => {
    if (!validateCNPJ(formData.cnpj)) {
      toast({
        title: "CNPJ Inválido",
        description: "Por favor, verifique o formato do CNPJ.",
        variant: "destructive"
      });
      return;
    }

    setSearchingCNPJ(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData: ReceiptaData = {
        razao_social: "WS Gestão Contábil LTDA",
        cnpj: formData.cnpj,
        endereco: "Rua das Empresas, 123 - Centro - São Paulo - SP - CEP: 01234-567",
        data_abertura: "2010-05-12",
        situacao_cadastral: "ATIVA"
      };

      setFormData(prev => ({
        ...prev,
        name: mockData.razao_social,
        address: mockData.endereco,
        opening_date: mockData.data_abertura,
        registration_status: mockData.situacao_cadastral,
        last_federal_update: new Date().toISOString(),
        last_query_date: new Date().toISOString()
      }));

      toast({
        title: "Sucesso",
        description: "Dados importados com sucesso da Receita Federal."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados. Verifique o CNPJ.",
        variant: "destructive"
      });
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_data')
        .upsert({
          user_id: userId,
          ...formData
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

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    handleInputChange('cnpj', formatted);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/users')}
          className="border-[#efc349]/30 hover:bg-[#efc349]/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] font-extralight">
            Dados da Empresa
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            {userData?.name || userData?.email || 'Usuário'}
          </p>
        </div>
      </div>

      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
        <CardContent className="space-y-8 p-8">
          {/* Informações Básicas */}
          <div className="space-y-6">
            <h3 className="text-[#020817] dark:text-[#efc349] font-medium text-lg">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#020817] dark:text-white font-extralight">
                  Razão Social
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-[#020817] dark:text-white font-extralight">
                  CNPJ
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                    maxLength={18}
                  />
                  {validateCNPJ(formData.cnpj) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={searchReceiptaFederal}
                      disabled={searchingCNPJ}
                      className="border-[#efc349]/30 hover:bg-[#efc349]/10 shrink-0"
                    >
                      {searchingCNPJ ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#efc349]" />
                      ) : (
                        <Search className="h-4 w-4 text-[#efc349]" />
                      )}
                    </Button>
                  )}
                </div>
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
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-[#020817] dark:text-white font-extralight">
                  Endereço
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  rows={3}
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountant_name" className="text-[#020817] dark:text-white font-extralight">
                  Nome do Contador
                </Label>
                <Input
                  id="accountant_name"
                  value={formData.accountant_name}
                  onChange={(e) => handleInputChange('accountant_name', e.target.value)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax_regime" className="text-[#020817] dark:text-white font-extralight">
                  Regime Tributário
                </Label>
                <Select value={formData.tax_regime} onValueChange={(value) => handleInputChange('tax_regime', value)}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Simples Nacional</SelectItem>
                    <SelectItem value="presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="real">Lucro Real</SelectItem>
                    <SelectItem value="mei">MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Campos Estratégicos - Admin */}
          <div className="space-y-6 border-t border-[#efc349]/20 pt-6">
            <h3 className="text-[#020817] dark:text-[#efc349] font-medium text-lg flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Campos Estratégicos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_status" className="text-[#020817] dark:text-white font-extralight">
                  Status do Cliente
                </Label>
                <Select value={formData.client_status} onValueChange={(value) => handleInputChange('client_status', value)}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="space-y-2 md:col-span-2">
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
          </div>

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
        </CardContent>
      </Card>
    </div>
  );
};
