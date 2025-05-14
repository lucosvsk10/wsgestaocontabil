
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePollForm } from "./CreatePollForm";
import { ManagePolls } from "./ManagePolls";
import { PollResults } from "./PollResults";
import { Poll } from "@/types/polls";
import { CreateNumericalPollForm } from "./CreateNumericalPollForm";
import { CreateFormPollForm } from "./CreateFormPollForm";

export const PollsTabView = () => {
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pollTypeTab, setPollTypeTab] = useState<string>("standard");

  const handlePollCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewResults = (poll: Poll) => {
    setSelectedPoll(poll);
  };

  return (
    <Tabs defaultValue="create" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-navy-deeper">
        <TabsTrigger value="create" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
          Criar nova enquete
        </TabsTrigger>
        <TabsTrigger value="manage" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
          Gerenciar enquetes
        </TabsTrigger>
        <TabsTrigger value="results" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
          Resultados de enquetes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <div className="p-4 bg-white dark:bg-navy-dark border border-blue-100 dark:border-gold/20 rounded-lg shadow-sm">
          <h3 className="text-xl font-medium mb-4 text-navy-dark dark:text-gold">Criar Nova Enquete</h3>
          
          <Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-navy-deeper">
              <TabsTrigger value="standard" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
                Enquete Padrão
              </TabsTrigger>
              <TabsTrigger value="numerical" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
                Formulário Numeral
              </TabsTrigger>
              <TabsTrigger value="form" className="text-navy-dark dark:text-white data-[state=active]:bg-white data-[state=active]:text-navy-dark dark:data-[state=active]:bg-navy-medium">
                Formulário Completo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard" className="mt-4">
              <CreatePollForm onPollCreated={handlePollCreated} />
            </TabsContent>
            
            <TabsContent value="numerical" className="mt-4">
              <CreateNumericalPollForm onPollCreated={handlePollCreated} />
            </TabsContent>
            
            <TabsContent value="form" className="mt-4">
              <CreateFormPollForm onPollCreated={handlePollCreated} />
            </TabsContent>
          </Tabs>
        </div>
      </TabsContent>

      <TabsContent value="manage">
        <div className="p-4 bg-white dark:bg-navy-dark border border-blue-100 dark:border-gold/20 rounded-lg shadow-sm">
          <h3 className="text-xl font-medium mb-4 text-navy-dark dark:text-gold">Gerenciar Enquetes</h3>
          <ManagePolls 
            refreshTrigger={refreshTrigger} 
            onViewResults={handleViewResults}
            onPollDeleted={handlePollCreated}
          />
        </div>
      </TabsContent>

      <TabsContent value="results">
        <div className="p-4 bg-white dark:bg-navy-dark border border-blue-100 dark:border-gold/20 rounded-lg shadow-sm">
          <h3 className="text-xl font-medium mb-4 text-navy-dark dark:text-gold">Resultados de Enquetes</h3>
          <PollResults selectedPoll={selectedPoll} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
