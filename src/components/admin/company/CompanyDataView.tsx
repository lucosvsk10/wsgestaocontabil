
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import { CompanyDataHeader } from "./CompanyDataHeader";
import { CompanyBasicInfoFields } from "./CompanyBasicInfoFields";
import { CompanyActivityFields } from "./CompanyActivityFields";
import { CompanyAddressFields } from "./CompanyAddressFields";
import { CompanyAdminFields } from "./CompanyAdminFields";
import { CompanyLoadingState } from "./CompanyLoadingState";
import { useCompanyData } from "./hooks/useCompanyData";
import { useCompanyImport } from "./CompanyImportHandler";

export const CompanyDataView = () => {
  const { userId } = useParams();
  const { isAdmin } = useAuth();
  
  const {
    loading,
    saving,
    userData,
    formData,
    setFormData,
    handleSave,
    handleInputChange
  } = useCompanyData(userId);

  const { handleImportFromRF, rfLoading } = useCompanyImport({
    formData,
    setFormData
  });

  if (loading) {
    return <CompanyLoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <SimpleNavbar title="Dados da Empresa" />
      
      <div className="pt-20 space-y-8 p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl text-[#020817] dark:text-[#efc349] font-extralight">
              Dados da Empresa
            </h1>
            <p className="text-gray-600 dark:text-white/70 font-extralight">
              {userData?.name || userData?.email || 'Usuário'}
              {!isAdmin && <span className="ml-2 text-amber-600">(Apenas visualização)</span>}
            </p>
          </div>
        </div>

        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle>
              <CompanyDataHeader
                isAdmin={isAdmin}
                cnpj={formData.cnpj}
                rfLoading={rfLoading}
                onImportFromRF={handleImportFromRF}
              />
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <CompanyBasicInfoFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={(field, value) => handleInputChange(field, value, isAdmin)}
            />

            <CompanyActivityFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={(field, value) => handleInputChange(field, value, isAdmin)}
            />

            <CompanyAddressFields
              formData={formData}
              isAdmin={isAdmin}
              onInputChange={(field, value) => handleInputChange(field, value, isAdmin)}
            />

            {isAdmin && (
              <CompanyAdminFields
                formData={formData}
                onInputChange={(field, value) => handleInputChange(field, value, isAdmin)}
              />
            )}

            {isAdmin && (
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(isAdmin)}
                  disabled={saving}
                  className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
