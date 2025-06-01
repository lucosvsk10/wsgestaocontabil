
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Building, MapPin, Phone, Mail, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
            <Building className="w-6 h-6 text-[#0b1320]" />
          </div>
          <h2 className="text-2xl font-light text-[#efc349] tracking-wide">
            DADOS DA EMPRESA
          </h2>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Dados não encontrados
              </h3>
              <p className="text-gray-400 text-center">
                Entre em contato com a contabilidade para atualizar os dados da empresa
              </p>
            </CardContent>
          </Card>
        </motion.div>
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
        <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Building className="w-6 h-6 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#efc349] tracking-wide">
          DADOS DA EMPRESA
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#efc349] flex items-center gap-2">
                <Building className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Razão Social</p>
                <p className="font-medium text-white">{companyData.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">CNPJ</p>
                <p className="font-medium text-white">{companyData.cnpj}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Data de Abertura</p>
                <p className="font-medium text-white">
                  {new Date(companyData.opening_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Regime Tributário</p>
                <p className="font-medium text-white">{companyData.tax_regime}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contato */}
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#efc349] flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Endereço</p>
                  <p className="font-medium text-white">{companyData.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Telefone</p>
                  <p className="font-medium text-white">{companyData.phone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">E-mail</p>
                  <p className="font-medium text-white">{companyData.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contabilidade */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-[#efc349] flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contabilidade Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400">Escritório</p>
                <p className="font-medium text-white text-lg">{companyData.accountant_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Contato do Contador</p>
                <p className="font-medium text-white">{companyData.accountant_contact}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
