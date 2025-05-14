
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderActionsProps {
  onExportCSV: () => void;
}

export const HeaderActions = ({ onExportCSV }: HeaderActionsProps) => {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        className="flex items-center gap-2" 
        onClick={onExportCSV}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Exportar CSV</span>
      </Button>
    </div>
  );
};
