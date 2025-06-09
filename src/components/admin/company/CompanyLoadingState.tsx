
import { Building2 } from "lucide-react";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";

export const CompanyLoadingState = () => {
  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <SimpleNavbar title="Dados da Empresa" />
      <div className="pt-20 flex items-center justify-center py-12">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando dados...</p>
        </div>
      </div>
    </div>
  );
};
