
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CompanyDataView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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
    accountant_contact: ""
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
        // Não existe dados da empresa ainda
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
          accountant_contact: data.accountant_contact || ""
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    } finally {
      setLoading(false);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center">
            <Building2 className="w-6 h-6 mr-2" />
            Informações da Empresa
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#020817] dark:text-white font-extralight">
                Nome da Empresa
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
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
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
              <Label htmlFor="tax_regime" className="text-[#020817] dark:text-white font-extralight">
                Regime Tributário
              </Label>
              <Input
                id="tax_regime"
                value={formData.tax_regime}
                onChange={(e) => handleInputChange('tax_regime', e.target.value)}
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
          </div>

          <div className="space-y-2">
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
