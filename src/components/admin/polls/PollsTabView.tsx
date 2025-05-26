
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
    <div className="space-y-8">
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-[#e6e6e6] shadow-sm dark:bg-transparent dark:border-[#efc349] dark:shadow-none">
          <TabsTrigger value="create" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
            Criar nova enquete
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
            Gerenciar enquetes
          </TabsTrigger>
          <TabsTrigger value="results" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
            Resultados de enquetes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <div className="p-6 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-[#efc349] dark:shadow-none">
            <Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-[#e6e6e6] shadow-sm dark:bg-transparent dark:border-[#efc349] dark:shadow-none">
                <TabsTrigger value="standard" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
                  Enquete Padrão
                </TabsTrigger>
                <TabsTrigger value="numerical" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
                  Formulário Numeral
                </TabsTrigger>
                <TabsTrigger value="form" className="text-[#020817] data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:text-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#efc349] dark:data-[state=active]:text-[#efc349]">
                  Formulário Completo
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="standard" className="mt-6">
                <CreatePollForm onPollCreated={handlePollCreated} />
              </TabsContent>
              
              <TabsContent value="numerical" className="mt-6">
                <CreateNumericalPollForm onPollCreated={handlePollCreated} />
              </TabsContent>
              
              <TabsContent value="form" className="mt-6">
                <CreateFormPollForm onPollCreated={handlePollCreated} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <div className="p-6 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-[#efc349] dark:shadow-none">
            <h3 className="text-xl font-medium mb-6 text-[#020817] dark:text-[#efc349]">Gerenciar Enquetes</h3>
            <ManagePolls refreshTrigger={refreshTrigger} onViewResults={handleViewResults} onPollDeleted={handlePollCreated} />
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="p-6 bg-white border border-[#e6e6e6] rounded-lg shadow-sm dark:bg-transparent dark:border-[#efc349] dark:shadow-none">
            <h3 className="text-xl font-medium mb-6 text-[#020817] dark:text-[#efc349]">Resultados de Enquetes</h3>
            <PollResults selectedPoll={selectedPoll} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
