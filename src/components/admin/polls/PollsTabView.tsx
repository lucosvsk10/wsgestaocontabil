
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePollForm } from "./CreatePollForm";
import { ManagePolls } from "./ManagePolls";
import { PollResults } from "./PollResults";
import { Poll } from "@/types/polls";

export const PollsTabView = () => {
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePollCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewResults = (poll: Poll) => {
    setSelectedPoll(poll);
  };

  return (
    <Tabs defaultValue="create" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="create" className="text-navy dark:text-white">
          Criar nova enquete
        </TabsTrigger>
        <TabsTrigger value="manage" className="text-navy dark:text-white">
          Gerenciar enquetes
        </TabsTrigger>
        <TabsTrigger value="results" className="text-navy dark:text-white">
          Resultados de enquetes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <div className="p-4 bg-white dark:bg-navy-dark border border-gold/20 rounded-lg">
          <h3 className="text-xl font-medium mb-4 text-navy dark:text-gold">Criar Nova Enquete</h3>
          <CreatePollForm onPollCreated={handlePollCreated} />
        </div>
      </TabsContent>

      <TabsContent value="manage">
        <div className="p-4 bg-white dark:bg-navy-dark border border-gold/20 rounded-lg">
          <h3 className="text-xl font-medium mb-4 text-navy dark:text-gold">Gerenciar Enquetes</h3>
          <ManagePolls 
            refreshTrigger={refreshTrigger} 
            onViewResults={handleViewResults}
            onPollDeleted={handlePollCreated}
          />
        </div>
      </TabsContent>

      <TabsContent value="results">
        <div className="p-4 bg-white dark:bg-navy-dark border border-gold/20 rounded-lg">
          <h3 className="text-xl font-medium mb-4 text-navy dark:text-gold">Resultados de Enquetes</h3>
          <PollResults selectedPoll={selectedPoll} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
