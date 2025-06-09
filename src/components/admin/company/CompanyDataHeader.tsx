
import { Button } from "@/components/ui/button";
import { Building2, Download, Loader2 } from "lucide-react";

interface CompanyDataHeaderProps {
  isAdmin: boolean;
  cnpj: string;
  rfLoading: boolean;
  onImportFromRF: () => void;
}

export const CompanyDataHeader = ({ 
  isAdmin, 
  cnpj, 
  rfLoading, 
  onImportFromRF 
}: CompanyDataHeaderProps) => {
  return (
    <div className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center justify-between">
      <div className="flex items-center">
        <Building2 className="w-6 h-6 mr-2" />
        Informações da Empresa
      </div>
      {isAdmin && (
        <Button
          onClick={onImportFromRF}
          disabled={rfLoading || !cnpj}
          variant="outline"
          className="border-[#efc349]/30 hover:bg-[#efc349]/10"
        >
          {rfLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Importar dados da RF
        </Button>
      )}
    </div>
  );
};
