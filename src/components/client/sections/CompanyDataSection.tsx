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
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 animate-pulse" />
          <div className="h-6 w-32 mx-auto bg-foreground/5 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-6 bg-foreground/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const DataRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) => (
    <div className="flex items-center py-3 border-b border-border/10 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground flex-1">{value || '-'}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header minimalista */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-light text-foreground">Dados da Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Informações cadastrais
        </p>
      </div>

      {!companyData ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-foreground/5 flex items-center justify-center">
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
        <div className="space-y-8">
          {/* Informações Básicas */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
              Informações Básicas
            </h2>
            <div className="bg-foreground/[0.02] rounded-lg px-4">
              <DataRow icon={Building2} label="Razão Social" value={companyData.name} />
              <DataRow icon={CreditCard} label="CNPJ" value={companyData.cnpj} />
              <DataRow icon={Calendar} label="Abertura" value={companyData.opening_date ? new Date(companyData.opening_date).toLocaleDateString('pt-BR') : undefined} />
              <DataRow icon={Building2} label="Regime" value={companyData.tax_regime} />
            </div>
          </div>

          {/* Contato */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
              Contato
            </h2>
            <div className="bg-foreground/[0.02] rounded-lg px-4">
              <DataRow icon={Phone} label="Telefone" value={companyData.phone} />
              <DataRow icon={Mail} label="E-mail" value={companyData.email} />
              <DataRow icon={MapPin} label="Endereço" value={companyData.address} />
            </div>
          </div>

          {/* Contador Responsável */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
              Contador Responsável
            </h2>
            <div className="bg-foreground/[0.02] rounded-lg px-4">
              <DataRow icon={User} label="Nome" value={companyData.accountant_name} />
              <DataRow icon={Phone} label="Contato" value={companyData.accountant_contact} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
