
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Link, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import NewsCarousel from './NewsCarousel';
import LinksGrid from './LinksGrid';
import FloatingLinksButton from './FloatingLinksButton';
import { sampleNews, usefulLinks, declarationsLinks } from './accountingData';
import { NewsItem } from './types';

const AccountingSection = () => {
  const [newsData, setNewsData] = useState(sampleNews);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const isMobile = useIsMobile();

  // Function to refresh news data
  const refreshNews = () => {
    setIsNewsLoading(true);

    // Simulate API call with setTimeout
    setTimeout(() => {
      // This would be replaced with actual API fetch in production
      const updatedNews = [...sampleNews].map(news => ({
        ...news,
        date: ["Hoje", "Ontem", "2 dias atrás", "3 dias atrás", "4 dias atrás"][Math.floor(Math.random() * 5)]
      }));
      setNewsData(updatedNews);
      setIsNewsLoading(false);
    }, 1000);
  };

  // Initial load
  useEffect(() => {
    // We're using sample data initially, but this would be an API call in production
  }, []);

  return (
    <section id="contabil" className="py-16 bg-orange-200 dark:bg-navy-dark px-6 fadein-on-scroll">
      <div className="container mx-auto">
        <h2 className="text-navy-light dark:text-gold mb-12 text-center text-3xl font-bold">Mundo Contábil</h2>
        
        <Tabs defaultValue="news" className="w-full max-w-4xl mx-auto">
          <TabsList className={`${isMobile ? 'flex flex-col w-full gap-2 h-auto bg-transparent' : 'grid w-full grid-cols-3 mb-8'}`}>
            <TabsTrigger value="news" className="flex items-center gap-2 data-[state=active]:bg-gold data-[state=active]:text-navy w-full">
              <Newspaper size={16} />
              <span>Notícias Contábeis</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2 data-[state=active]:bg-gold data-[state=active]:text-navy w-full">
              <Link size={16} />
              <span>Links Úteis</span>
            </TabsTrigger>
            <TabsTrigger value="declarations" className="flex items-center gap-2 data-[state=active]:bg-gold data-[state=active]:text-navy w-full">
              <FileText size={16} />
              <span>Declarações</span>
            </TabsTrigger>
          </TabsList>
          
          {/* News Carousel Tab */}
          <TabsContent value="news">
            <NewsCarousel 
              newsData={newsData} 
              isNewsLoading={isNewsLoading} 
              refreshNews={refreshNews} 
            />
          </TabsContent>
          
          {/* Useful Links Tab */}
          <TabsContent value="links">
            <LinksGrid links={usefulLinks} />
          </TabsContent>
          
          {/* Declarations Tab */}
          <TabsContent value="declarations">
            <LinksGrid 
              links={declarationsLinks} 
              columns="grid-cols-1 md:grid-cols-2 gap-4" 
            />
          </TabsContent>
          
          {/* Floating Button */}
          <FloatingLinksButton links={usefulLinks} />
        </Tabs>
      </div>
    </section>
  );
};

export default AccountingSection;
