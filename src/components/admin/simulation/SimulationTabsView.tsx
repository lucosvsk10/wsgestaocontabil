
import { FileText, BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SimulationTabsViewProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
}

export const SimulationTabsView = ({ activeTab, onTabChange, children }: SimulationTabsViewProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full md:w-auto grid-cols-2 mb-4">
        <TabsTrigger value="list" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Simulações</span>
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          <span>Análise</span>
        </TabsTrigger>
      </TabsList>
      
      {children}
    </Tabs>
  );
};
