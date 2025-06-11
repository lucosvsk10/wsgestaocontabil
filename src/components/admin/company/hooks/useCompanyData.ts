
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyFormData {
  name: string;
  cnpj: string;
  opening_date: string;
  tax_regime: string;
  phone: string;
  email: string;
  address: string;
  accountant_name: string;
  accountant_contact: string;
  fantasy_name: string;
  cadastral_situation: string;
  social_capital: string;
  main_activity: string;
  secondary_activities: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  registration_status: string;
  last_federal_update: string;
  last_query_date: string;
  internal_tags: string;
  client_status: string;
  internal_observations: string;
  internal_responsible: string;
}

const initialFormData: CompanyFormData = {
  name: "",
  cnpj: "",
  opening_date: "",
  tax_regime: "",
  phone: "",
  email: "",
  address: "",
  accountant_name: "",
  accountant_contact: "",
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
  registration_status: "",
  last_federal_update: "",
  last_query_date: "",
  internal_tags: "",
  client_status: "",
  internal_observations: "",
  internal_responsible: ""
};

export const useCompanyData = (userId: string | undefined) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);

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

  const handleSave = async (isAdmin: boolean) => {
    if (!userId || !isAdmin) return;

    setSaving(true);
    try {
      const dataToSave = {
        user_id: userId,
        ...formData,
        internal_tags: formData.internal_tags ? formData.internal_tags.split(',').map(tag => tag.trim()) : [],
        last_federal_update: formData.last_federal_update === "" ? null : formData.last_federal_update,
        last_query_date: formData.last_query_date === "" ? null : formData.last_query_date
      };

      // Usar upsert com onConflict especificando a coluna de conflito
      const { error } = await supabase
        .from('company_data')
        .upsert(dataToSave, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
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

  const handleInputChange = (field: string, value: string, isAdmin: boolean) => {
    if (!isAdmin) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    loading,
    saving,
    userData,
    formData,
    setFormData,
    handleSave,
    handleInputChange
  };
};
