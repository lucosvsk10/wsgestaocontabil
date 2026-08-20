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
  return <div className="admin-page">
      <header className="admin-page-header"><div><p className="admin-eyebrow">Relacionamento com clientes</p><h1 className="admin-title">Enquetes</h1><p className="admin-subtitle">Crie consultas, acompanhe respostas e consolide os resultados enviados pelos clientes.</p></div></header>

      <Tabs defaultValue="create" className="admin-surface">
        <TabsList className="grid h-12 w-full grid-cols-3 rounded-none border-b border-[var(--admin-line)] bg-[var(--admin-canvas)]/60 p-1">
          <TabsTrigger value="create" className="rounded-md text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            Criar Enquete
          </TabsTrigger>
          <TabsTrigger value="manage" className="rounded-md text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            Gerenciar
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-md text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="m-0">
          <div className="space-y-6 p-5">
            <Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 rounded-md bg-[var(--admin-canvas)] p-1">
                <TabsTrigger value="standard" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">
                  Enquete Padrão
                </TabsTrigger>
                <TabsTrigger value="numerical" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">
                  Formulário Numeral
                </TabsTrigger>
                <TabsTrigger value="form" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">
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

        <TabsContent value="manage" className="m-0">
          <div className="space-y-6 p-5">
            <h3 className="admin-section-title">Enquetes cadastradas</h3>
            <ManagePolls refreshTrigger={refreshTrigger} onViewResults={handleViewResults} onPollDeleted={handlePollCreated} />
          </div>
        </TabsContent>

        <TabsContent value="results" className="m-0">
          <div className="space-y-6 p-5">
            <h3 className="admin-section-title">Resultados consolidados</h3>
            <PollResults selectedPoll={selectedPoll} />
          </div>
        </TabsContent>
      </Tabs>
    </div>;
};
