import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePollForm } from "./CreatePollForm";
import { ManagePolls } from "./ManagePolls";
import { PollResults } from "./PollResults";
import { Poll } from "@/types/polls";
import { CreateNumericalPollForm } from "./CreateNumericalPollForm";
import { CreateFormPollForm } from "./CreateFormPollForm";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";

const trigger="rounded-lg px-4 py-2 text-sm text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";
export const PollsTabView=()=>{
 const [selectedPoll,setSelectedPoll]=useState<Poll|null>(null),[refreshTrigger,setRefreshTrigger]=useState(0),[pollTypeTab,setPollTypeTab]=useState('standard');
 const refresh=()=>setRefreshTrigger(v=>v+1);
 return <div>
  <AdminPageHeader eyebrow="Comunicação" title="Enquetes" description="Crie, publique e acompanhe respostas dos clientes."/>
  <Tabs defaultValue="create" className="mt-6 space-y-4">
   <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-border/60 bg-muted/15 p-1"><TabsTrigger value="create" className={trigger}>Criar</TabsTrigger><TabsTrigger value="manage" className={trigger}>Gerenciar</TabsTrigger><TabsTrigger value="results" className={trigger}>Resultados</TabsTrigger></TabsList>
   <TabsContent value="create"><AdminSection className="p-5"><Tabs value={pollTypeTab} onValueChange={setPollTypeTab} className="space-y-5"><TabsList className="h-auto w-full justify-start gap-1 rounded-lg bg-muted/20 p-1"><TabsTrigger value="standard" className={trigger}>Padrão</TabsTrigger><TabsTrigger value="numerical" className={trigger}>Numeral</TabsTrigger><TabsTrigger value="form" className={trigger}>Formulário completo</TabsTrigger></TabsList><TabsContent value="standard"><CreatePollForm onPollCreated={refresh}/></TabsContent><TabsContent value="numerical"><CreateNumericalPollForm onPollCreated={refresh}/></TabsContent><TabsContent value="form"><CreateFormPollForm onPollCreated={refresh}/></TabsContent></Tabs></AdminSection></TabsContent>
   <TabsContent value="manage"><AdminSection className="p-5"><h3 className="mb-4 font-semibold">Enquetes publicadas</h3><ManagePolls refreshTrigger={refreshTrigger} onViewResults={setSelectedPoll} onPollDeleted={refresh}/></AdminSection></TabsContent>
   <TabsContent value="results"><AdminSection className="p-5"><h3 className="mb-4 font-semibold">Resultados</h3><PollResults selectedPoll={selectedPoll}/></AdminSection></TabsContent>
  </Tabs>
 </div>;
};
