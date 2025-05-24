
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
  
  return <Tabs defaultValue="create" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 bg-white border border-[#e6e6e6] shadow-sm dark:bg-deepNavy-80">
        <TabsTrigger value="create" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
          Criar nova enquete
        </TabsTrigger>
        <TabsTrigger value="manage" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
          Gerenciar enquetes
        </TabsTrigger>
        <TabsTrigger value="results" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
          Resultados de enquetes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <div className="p-4 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-gold dark:border-opacity-30">
          
          
          <Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border border-[#e6e6e6] shadow-sm dark:bg-deepNavy-80">
              <TabsTrigger value="standard" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
                Enquete Padrão
              </TabsTrigger>
              <TabsTrigger value="numerical" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
                Formulário Numeral
              </TabsTrigger>
              <TabsTrigger value="form" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-[#d9d9d9] dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-gold dark:data-[state=active]:text-gold">
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
        <div className="p-4 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-gold dark:border-opacity-30">
          <h3 className="text-xl font-medium mb-4 text-[#020817] dark:text-gold">Gerenciar Enquetes</h3>
          <ManagePolls refreshTrigger={refreshTrigger} onViewResults={handleViewResults} onPollDeleted={handlePollCreated} />
        </div>
      </TabsContent>

      <TabsContent value="results">
        <div className="p-4 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-gold dark:border-opacity-30">
          <h3 className="text-xl font-medium mb-4 text-[#020817] dark:text-gold">Resultados de Enquetes</h3>
          <PollResults selectedPoll={selectedPoll} />
        </div>
      </TabsContent>
    </Tabs>;
};
