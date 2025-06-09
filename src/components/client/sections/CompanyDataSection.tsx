
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
      <Card className="bg-[#0b1320] border-[#efc349]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-6 bg-[#020817] rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0b1320] border-[#efc349]/20">
      <CardHeader>
        <CardTitle className="text-[#efc349] font-extralight flex items-center">
          <Building2 className="w-6 h-6 mr-2" />
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {!companyData ? (
          <div className="text-center py-8 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Dados da empresa não cadastrados</p>
            <p className="text-sm mt-2">Entre em contato com o escritório para cadastrar</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#efc349] font-medium mb-2">Informações Básicas</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">{companyData.name}</span>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">{companyData.cnpj}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">
                        Abertura: {new Date(companyData.opening_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">
                        Regime: {companyData.tax_regime}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[#efc349] font-medium mb-2">Contato</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">{companyData.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-white font-extralight">{companyData.email}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      <span className="text-white font-extralight">{companyData.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[#efc349] font-medium mb-2">Contador Responsável</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-white font-extralight">{companyData.accountant_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-white font-extralight">{companyData.accountant_contact}</span>
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
