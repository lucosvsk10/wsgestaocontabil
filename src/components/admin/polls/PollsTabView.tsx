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
  return <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-[#020817] dark:text-[#efc349] mb-4 text-3xl font-thin">Gestão de Enquetes</h1>
        <p className="text-gray-600 dark:text-white/70">Crie, gerencie e visualize resultados das enquetes</p>
      </div>

      <Tabs defaultValue="create" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 bg-gray-50 dark:bg-transparent rounded-xl p-1">
          <TabsTrigger value="create" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
            Criar Enquete
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
            Gerenciar
          </TabsTrigger>
          <TabsTrigger value="results" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
            Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-8">
          <div className="p-8 space-y-8">
            <Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 bg-gray-50 dark:bg-transparent rounded-xl p-1">
                <TabsTrigger value="standard" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
                  Enquete Padrão
                </TabsTrigger>
                <TabsTrigger value="numerical" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
                  Formulário Numeral
                </TabsTrigger>
                <TabsTrigger value="form" className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg">
                  Formulário Completo
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="standard">
                <CreatePollForm onPollCreated={handlePollCreated} />
              </TabsContent>
              
              <TabsContent value="numerical">
                <CreateNumericalPollForm onPollCreated={handlePollCreated} />
              </TabsContent>
              
              <TabsContent value="form">
                <CreateFormPollForm onPollCreated={handlePollCreated} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-8">
          <div className="p-8 space-y-8">
            <h3 className="text-xl font-medium text-[#020817] dark:text-[#efc349]">Gerenciar Enquetes</h3>
            <ManagePolls refreshTrigger={refreshTrigger} onViewResults={handleViewResults} onPollDeleted={handlePollCreated} />
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-8">
          <div className="p-8 space-y-8">
            <h3 className="text-xl font-medium text-[#020817] dark:text-[#efc349]">Resultados de Enquetes</h3>
            <PollResults selectedPoll={selectedPoll} />
          </div>
        </TabsContent>
      </Tabs>
    </div>;
};