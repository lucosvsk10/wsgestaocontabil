
import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SimulationTabsViewProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: ReactNode;
}

export const SimulationTabsView = ({ activeTab, onTabChange, children }: SimulationTabsViewProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4 w-full md:w-auto">
        <TabsTrigger value="list">Lista de Simulações</TabsTrigger>
        <TabsTrigger value="analytics">Análises e Gráficos</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};
