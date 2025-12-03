import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, MapPin, Phone, Mail, Calendar, CreditCard, User } from "lucide-react";
import { CompanyData } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CompanyDataSection = () => {
  const { user } = useAuth();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

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
      setCompanyData(data);
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted animate-pulse mb-4" />
          <div className="h-6 w-32 mx-auto bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const DataRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) => (
    <div className="flex items-center py-3.5 px-4 hover:bg-muted/50 transition-colors rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mr-3 flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground flex-1 font-medium">{value || '-'}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      {/* Header minimalista */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-1">
          Dados da Empresa
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Informações cadastrais
        </p>
      </div>

      {!companyData ? (
        <div className="bg-card rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            Dados da empresa não cadastrados
          </h3>
          <p className="text-xs text-muted-foreground">
            Entre em contato com o escritório para cadastrar
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Informações Básicas
              </h2>
            </div>
            <div className="p-2">
              <DataRow icon={Building2} label="Razão Social" value={companyData.name} />
              <DataRow icon={CreditCard} label="CNPJ" value={companyData.cnpj} />
              <DataRow icon={Calendar} label="Abertura" value={companyData.opening_date ? new Date(companyData.opening_date).toLocaleDateString('pt-BR') : undefined} />
              <DataRow icon={Building2} label="Regime" value={companyData.tax_regime} />
            </div>
          </div>

          {/* Contato */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Contato
              </h2>
            </div>
            <div className="p-2">
              <DataRow icon={Phone} label="Telefone" value={companyData.phone} />
              <DataRow icon={Mail} label="E-mail" value={companyData.email} />
              <DataRow icon={MapPin} label="Endereço" value={companyData.address} />
            </div>
          </div>

          {/* Contador Responsável */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Contador Responsável
              </h2>
            </div>
            <div className="p-2">
              <DataRow icon={User} label="Nome" value={companyData.accountant_name} />
              <DataRow icon={Phone} label="Contato" value={companyData.accountant_contact} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
