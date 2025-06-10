
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail, Calendar, CreditCard } from "lucide-react";
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
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-6 bg-gray-100 dark:bg-[#020817] rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
      <CardHeader className="bg-white dark:bg-[#0b1320] border-b border-gray-200 dark:border-[#efc349]/20">
        <CardTitle className="text-[#020817] dark:text-[#efc349] font-semibold flex items-center text-2xl">
          <Building2 className="w-6 h-6 mr-3" />
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      
      <CardContent className="bg-white dark:bg-[#0b1320] p-6">
        {!companyData ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#020817] rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#020817] dark:text-white mb-2">
              Dados da empresa não cadastrados
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Entre em contato com o escritório para cadastrar
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/20 rounded-xl p-6">
                  <h3 className="text-[#020817] dark:text-[#efc349] font-semibold mb-4 text-lg">Informações Básicas</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.name}</span>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.cnpj}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">
                        Abertura: {new Date(companyData.opening_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">
                        Regime: {companyData.tax_regime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/20 rounded-xl p-6">
                  <h3 className="text-[#020817] dark:text-[#efc349] font-semibold mb-4 text-lg">Contato</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.email}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/20 rounded-xl p-6">
                  <h3 className="text-[#020817] dark:text-[#efc349] font-semibold mb-4 text-lg">Contador Responsável</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.accountant_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-[#020817] dark:text-white font-medium">{companyData.accountant_contact}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
