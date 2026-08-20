
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnnouncementsContainer } from './components/AnnouncementsContainer';
import { ClientAnnouncementsContainer } from './components/ClientAnnouncementsContainer';

export const AnnouncementsView = () => {
  return (
    <div className="admin-page">
      <header className="admin-page-header"><div><p className="admin-eyebrow">Comunicação</p><h1 className="admin-title">Anúncios e comunicados</h1><p className="admin-subtitle">Publique informações para os clientes e organize as comunicações ativas do portal.</p></div></header>

      <Tabs defaultValue="announcements" className="admin-surface w-full">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-b border-[var(--admin-line)] bg-[var(--admin-canvas)]/60 p-1">
          <TabsTrigger 
            value="announcements"
            className="rounded-md text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Anúncios
          </TabsTrigger>
          <TabsTrigger 
            value="communications"
            className="rounded-md text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Comunicados
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="announcements" className="m-0 p-5">
          <AnnouncementsContainer />
        </TabsContent>
        
        <TabsContent value="communications" className="m-0 p-5">
          <ClientAnnouncementsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
};
