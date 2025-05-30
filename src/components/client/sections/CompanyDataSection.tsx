
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Building, MapPin, Phone, Mail, Calendar, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const CompanyDataSection = () => {
  const { companyData, fetchCompanyData, isLoading } = useClientData();

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              Dados da empresa não encontrados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              As informações da sua empresa aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Building className="w-5 h-5 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#020817] dark:text-[#efc349]">
          Dados da Empresa
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349] flex items-center gap-2">
                <Building className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Razão Social</p>
                <p className="text-[#020817] dark:text-white font-medium">{companyData.name}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">CNPJ</p>
                <p className="text-[#020817] dark:text-white">{companyData.cnpj}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Data de Abertura</p>
                <p className="text-[#020817] dark:text-white">
                  {new Date(companyData.opening_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Regime Tributário</p>
                <p className="text-[#020817] dark:text-white">{companyData.tax_regime}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contato da Empresa */}
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349] flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contato da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Endereço</p>
                  <p className="text-[#020817] dark:text-white">{companyData.address}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Telefone</p>
                  <p className="text-[#020817] dark:text-white">{companyData.phone}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">E-mail</p>
                  <p className="text-[#020817] dark:text-white">{companyData.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informações Contábeis */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349] flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Contábeis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Contador Responsável</p>
                  <p className="text-[#020817] dark:text-white font-medium">{companyData.accountant_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Contato do Contador</p>
                  <p className="text-[#020817] dark:text-white">{companyData.accountant_contact}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
