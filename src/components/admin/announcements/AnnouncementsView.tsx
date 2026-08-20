
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnnouncementsContainer } from './components/AnnouncementsContainer';
import { ClientAnnouncementsContainer } from './components/ClientAnnouncementsContainer';

export const AnnouncementsView = () => {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
          Gerenciar Comunicação
        </h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">
          Gerencie anúncios e comunicados para os clientes
        </p>
      </div>

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/30">
          <TabsTrigger 
            value="announcements"
            className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
          >
            Anúncios
          </TabsTrigger>
          <TabsTrigger 
            value="communications"
            className="data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
          >
            Comunicados
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="announcements" className="mt-6">
          <AnnouncementsContainer />
        </TabsContent>
        
        <TabsContent value="communications" className="mt-6">
          <ClientAnnouncementsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
};
