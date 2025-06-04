
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnouncementsView } from './AnnouncementsView';
import { CommunicationsView } from './CommunicationsView';

export const AnnouncementsTabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('announcements');

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
          Comunicação
        </h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">
          Gerencie anúncios e comunicados do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <TabsTrigger 
            value="announcements" 
            className="font-extralight data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:data-[state=active]:bg-[#efc349] dark:data-[state=active]:text-[#020817]"
          >
            Anúncios
          </TabsTrigger>
          <TabsTrigger 
            value="communications" 
            className="font-extralight data-[state=active]:bg-[#020817] data-[state=active]:text-white dark:data-[state=active]:bg-[#efc349] dark:data-[state=active]:text-[#020817]"
          >
            Comunicados
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="announcements" className="mt-6">
          <AnnouncementsView />
        </TabsContent>
        
        <TabsContent value="communications" className="mt-6">
          <CommunicationsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
