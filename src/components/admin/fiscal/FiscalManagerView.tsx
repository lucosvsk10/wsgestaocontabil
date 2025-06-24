
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, FileText, BarChart3, Settings } from "lucide-react";
import FiscalDashboard from "./FiscalDashboard";
import CompanyRegistration from "./CompanyRegistration";
import DocumentsList from "./DocumentsList";
import FiscalSettings from "./FiscalSettings";

const FiscalManagerView = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdfdfd] to-[#f8f9fa] dark:from-[#020817] dark:to-[#0a0f1c] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#efc349]/10 rounded-xl">
              <Building className="w-8 h-8 text-[#efc349]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#020817] dark:text-white">
                Gestor Fiscal
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sistema de automação fiscal para coleta de documentos
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#efc349] text-[#020817] px-3 py-1 rounded-full text-sm font-bold">
              BETA
            </span>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-[#020817] dark:text-white">
              Automação Fiscal
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Gerencie empresas, certificados e documentos fiscais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-[#1a1a2e]">
                <TabsTrigger 
                  value="dashboard" 
                  className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="companies" 
                  className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Empresas
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <FiscalDashboard />
              </TabsContent>

              <TabsContent value="companies" className="space-y-6">
                <CompanyRegistration />
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <DocumentsList />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <FiscalSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FiscalManagerView;
