
import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, FileText } from "lucide-react";

interface SimulationTabsViewProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const SimulationTabsView = ({ 
  children, 
  activeTab, 
  onTabChange 
}: SimulationTabsViewProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
        <TabsTrigger value="list" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Simulações</span>
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          <span>Análise</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value={activeTab} className="mt-0">
        {children}
      </TabsContent>
    </Tabs>
  );
};
