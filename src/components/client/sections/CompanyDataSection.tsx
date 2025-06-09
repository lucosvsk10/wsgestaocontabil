
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail, Calendar, FileText, User, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const CompanyDataSection = () => {
  const { user, userData } = useAuth();
  
  // Mock data para dados da empresa
  const companyData = {
    name: "Empresa Exemplo LTDA",
    cnpj: "12.345.678/0001-90",
    opening_date: "2020-01-15",
    tax_regime: "Simples Nacional",
    address: "Rua Exemplo, 123 - Centro",
    city: "São Paulo",
    state: "SP",
    cep: "01234-567",
    phone: "(11) 9999-9999",
    email: user?.email || "empresa@exemplo.com",
    accountant_name: "WS Gestão Contábil",
    accountant_crc: "CRC-SP 123456",
    accountant_contact: "(11) 8888-8888"
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTaxRegimeColor = (regime: string) => {
    switch (regime) {
      case "Simples Nacional":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300";
      case "Lucro Presumido":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300";
      case "Lucro Real":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#efc349]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-[#020817] dark:text-white">
              Dados da Empresa
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
              Informações cadastrais e contábeis
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Básicos */}
        <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="flex items-center text-[#020817] dark:text-white font-extralight">
              <Building2 className="w-5 h-5 mr-2 text-[#efc349]" />
              Dados Básicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Razão Social
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-extralight">
                {companyData.name}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                CNPJ
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-mono">
                {companyData.cnpj}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Data de Abertura
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-[#efc349]" />
                {formatDate(companyData.opening_date)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Regime Tributário
              </label>
              <div className="mt-1">
                <Badge className={getTaxRegimeColor(companyData.tax_regime)}>
                  {companyData.tax_regime}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados de Contato */}
        <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="flex items-center text-[#020817] dark:text-white font-extralight">
              <Phone className="w-5 h-5 mr-2 text-[#efc349]" />
              Dados de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Endereço
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-1 text-[#efc349] flex-shrink-0" />
                <span>
                  {companyData.address}<br />
                  {companyData.city} - {companyData.state}<br />
                  CEP: {companyData.cep}
                </span>
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Telefone
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                <Phone className="w-4 h-4 mr-2 text-[#efc349]" />
                {companyData.phone}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                E-mail
              </label>
              <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                <Mail className="w-4 h-4 mr-2 text-[#efc349]" />
                {companyData.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados Contábeis */}
        <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-[#020817] dark:text-white font-extralight">
              <User className="w-5 h-5 mr-2 text-[#efc349]" />
              Responsável Contábil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Nome do Contador
                </label>
                <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-[#efc349]" />
                  {companyData.accountant_name}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  CRC
                </label>
                <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-[#efc349]" />
                  {companyData.accountant_crc}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Contato
                </label>
                <p className="text-lg text-[#020817] dark:text-white font-extralight flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-[#efc349]" />
                  {companyData.accountant_contact}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card className="bg-gradient-to-r from-[#efc349]/10 to-[#efc349]/5 dark:from-[#efc349]/20 dark:to-[#efc349]/10 border-[#efc349]/30">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-[#020817] dark:text-white mb-2">
              Precisa atualizar alguma informação?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 font-extralight mb-4">
              Entre em contato conosco para atualizar os dados da sua empresa
            </p>
            <div className="flex items-center justify-center space-x-4">
              <a 
                href="tel:+5511888888888" 
                className="flex items-center text-[#efc349] hover:text-[#efc349]/80 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                (11) 8888-8888
              </a>
              <a 
                href="mailto:contato@wsgestao.com.br" 
                className="flex items-center text-[#efc349] hover:text-[#efc349]/80 transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                contato@wsgestao.com.br
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
