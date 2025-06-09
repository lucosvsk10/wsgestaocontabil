import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, Mail, Calendar, CreditCard, Save, Loader2, Search, AlertCircle, CheckCircle, User, Shield } from "lucide-react";
import { CompanyData } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkIsAdmin } from "@/utils/auth/userChecks";

interface ReceiptaData {
  razao_social: string;
  cnpj: string;
  endereco: string;
  data_abertura: string;
  situacao_cadastral: string;
}

export const CompanyDataSection = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const isAdmin = checkIsAdmin(userData, user?.email);
  
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  
  const [formData, setFormData] = useState({
    // Campos visíveis para todos
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    opening_date: "",
    tax_regime: "",
    accountant_name: "",
    accountant_contact: "",
    
    // Campos estratégicos (apenas admin)
    registration_status: "",
    last_federal_update: "",
    last_query_date: "",
    internal_tags: [] as string[],
    client_status: "",
    internal_observations: "",
    internal_responsible: ""
  });

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCompanyData(data);
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
      // Mock da API da Receita Federal
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay da API
      
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
        description: "Dados importados com sucesso da Receita Federal.",
        variant: "default"
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

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_data')
        .upsert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados da empresa salvos com sucesso."
      });
      
      fetchCompanyData();
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

  if (loading) {
    return (
      <Card className="bg-transparent border-[#efc349]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-6 bg-[#efc349]/10 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-[#efc349]/20">
      <CardHeader>
        <CardTitle className="text-[#efc349] font-extralight flex items-center">
          <Building2 className="w-6 h-6 mr-2" />
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Informações Básicas */}
          <div className="space-y-6">
            <h3 className="text-[#efc349] font-medium text-lg">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-extralight">
                  Razão Social
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="Digite a razão social"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-white font-extralight">
                  CNPJ
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                    placeholder="00.000.000/0000-00"
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
                <Label htmlFor="email" className="text-white font-extralight">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="empresa@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white font-extralight">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-white font-extralight">
                  Endereço
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="Endereço completo da empresa"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_date" className="text-white font-extralight">
                  Data de Abertura
                </Label>
                <Input
                  id="opening_date"
                  type="date"
                  value={formData.opening_date}
                  onChange={(e) => handleInputChange('opening_date', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_regime" className="text-white font-extralight">
                  Regime Tributário
                </Label>
                <Select value={formData.tax_regime} onValueChange={(value) => handleInputChange('tax_regime', value)}>
                  <SelectTrigger className="bg-transparent border-[#efc349]/30 text-white">
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

          {/* Dados do Contador */}
          <div className="space-y-6">
            <h3 className="text-[#efc349] font-medium text-lg flex items-center">
              <User className="w-5 h-5 mr-2" />
              Contador Responsável
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="accountant_name" className="text-white font-extralight">
                  Nome do Contador
                </Label>
                <Input
                  id="accountant_name"
                  value={formData.accountant_name}
                  onChange={(e) => handleInputChange('accountant_name', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="Nome completo do contador"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountant_contact" className="text-white font-extralight">
                  Contato do Contador
                </Label>
                <Input
                  id="accountant_contact"
                  value={formData.accountant_contact}
                  onChange={(e) => handleInputChange('accountant_contact', e.target.value)}
                  className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                  placeholder="Telefone ou e-mail"
                />
              </div>
            </div>
          </div>

          {/* Campos Estratégicos - Apenas para Admin */}
          {isAdmin && (
            <div className="space-y-6 border-t border-[#efc349]/20 pt-6">
              <h3 className="text-[#efc349] font-medium text-lg flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Campos Estratégicos
                <span className="ml-2 text-xs bg-[#efc349]/20 px-2 py-1 rounded text-[#efc349]">
                  Admin Only
                </span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="registration_status" className="text-white font-extralight">
                    Situação Cadastral
                  </Label>
                  <Input
                    id="registration_status"
                    value={formData.registration_status}
                    onChange={(e) => handleInputChange('registration_status', e.target.value)}
                    className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                    placeholder="Status na Receita Federal"
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_status" className="text-white font-extralight">
                    Status do Cliente
                  </Label>
                  <Select value={formData.client_status} onValueChange={(value) => handleInputChange('client_status', value)}>
                    <SelectTrigger className="bg-transparent border-[#efc349]/30 text-white">
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
                  <Label htmlFor="last_federal_update" className="text-white font-extralight">
                    Última Atualização RF
                  </Label>
                  <Input
                    id="last_federal_update"
                    type="datetime-local"
                    value={formData.last_federal_update}
                    className="bg-transparent border-[#efc349]/30 text-white"
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_responsible" className="text-white font-extralight">
                    Responsável Interno
                  </Label>
                  <Input
                    id="internal_responsible"
                    value={formData.internal_responsible}
                    onChange={(e) => handleInputChange('internal_responsible', e.target.value)}
                    className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                    placeholder="Nome do colaborador responsável"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="internal_observations" className="text-white font-extralight">
                    Observações Internas
                  </Label>
                  <Textarea
                    id="internal_observations"
                    value={formData.internal_observations}
                    onChange={(e) => handleInputChange('internal_observations', e.target.value)}
                    className="bg-transparent border-[#efc349]/30 text-white placeholder:text-[#9ca3af]"
                    placeholder="Observações e anotações internas"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botão Salvar */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-transparent border border-[#efc349] text-[#efc349] hover:bg-[#efc349]/10 px-8 py-2 rounded-xl font-extralight"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};
