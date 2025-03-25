import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, Link, Plus, X, Calculator } from "lucide-react";

// Sample accounting news data
const sampleNews = [{
  id: 1,
  title: "Novas regras de IRPF para 2024",
  description: "Receita Federal anuncia mudanças nas declarações do Imposto de Renda Pessoa Física para o próximo ano.",
  date: "Hoje"
}, {
  id: 2,
  title: "Mudanças no eSocial para empresas",
  description: "Sistema de escrituração digital das obrigações fiscais passa por atualizações importantes.",
  date: "Ontem"
}, {
  id: 3,
  title: "CFC divulga calendário de provas para 2024",
  description: "Conselho Federal de Contabilidade publica datas dos exames de suficiência para o próximo ano.",
  date: "2 dias atrás"
}, {
  id: 4,
  title: "Nova regulamentação para MEIs",
  description: "Governo anuncia simplificação nas obrigações contábeis para Microempreendedores Individuais.",
  date: "3 dias atrás"
}, {
  id: 5,
  title: "Uso de IA na contabilidade cresce 45%",
  description: "Pesquisa revela aumento significativo na adoção de inteligência artificial em escritórios contábeis.",
  date: "4 dias atrás"
}];

// Sample useful links
const usefulLinks = [{
  id: 1,
  title: "Receita Federal",
  url: "https://www.gov.br/receitafederal/pt-br",
  description: "Portal da Receita Federal do Brasil"
}, {
  id: 2,
  title: "Conselho Federal de Contabilidade",
  url: "https://cfc.org.br/",
  description: "Site oficial do CFC"
}, {
  id: 3,
  title: "Portal eSocial",
  url: "https://www.gov.br/esocial/pt-br",
  description: "Sistema de Escrituração Digital das Obrigações Fiscais"
}, {
  id: 4,
  title: "Portal da SPED",
  url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital",
  description: "Sistema Público de Escrituração Digital"
}, {
  id: 5,
  title: "Gov.br",
  url: "https://www.gov.br/pt-br",
  description: "Portal de serviços do Governo Federal"
}];

const AccountingSection = () => {
  const [isFloatingButtonOpen, setIsFloatingButtonOpen] = useState(false);
  const [newsData, setNewsData] = useState(sampleNews);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

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
  return <section id="contabil" className="py-16 bg-navy px-6 fadein-on-scroll">
      <div className="container mx-auto">
        <h2 className="text-4xl font-anton text-gold mb-12 text-center">MUNDO CONTÁBIL</h2>
        
        <Tabs defaultValue="news" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper size={16} />
              <span>Notícias Contábeis</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link size={16} />
              <span>Links Úteis</span>
            </TabsTrigger>
          </TabsList>
          
          {/* News Carousel Tab */}
          <TabsContent value="news" className="relative">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" className="text-gold border-gold hover:bg-gold hover:text-navy" onClick={refreshNews} disabled={isNewsLoading}>
                {isNewsLoading ? <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Atualizando...
                  </span> : "Atualizar Notícias"}
              </Button>
            </div>
            
            <Carousel className="w-full max-w-4xl">
              <CarouselContent>
                {newsData.map(news => <CarouselItem key={news.id} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-gray-800 border-gold/20 h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-gold text-xl">{news.title}</CardTitle>
                        <CardDescription className="text-gray-400 text-xs">{news.date}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-300">{news.description}</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>)}
              </CarouselContent>
              <div className="flex justify-center mt-4">
                <CarouselPrevious className="relative static left-0 right-0 mx-2 translate-y-0" />
                <CarouselNext className="relative static left-0 right-0 mx-2 translate-y-0" />
              </div>
            </Carousel>
          </TabsContent>
          
          {/* Useful Links Tab */}
          <TabsContent value="links">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usefulLinks.map(link => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="bg-gray-800 border-gold/20 h-full hover:border-gold/60 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-gold text-xl">{link.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-300">{link.description}</p>
                    </CardContent>
                  </Card>
                </a>)}
            </div>
            
            {/* Floating Button */}
            <div className="fixed bottom-8 right-8 z-30">
              {isFloatingButtonOpen ? <div className="bg-navy-dark border border-gold/30 rounded-lg p-4 shadow-lg mb-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-gold font-medium">Links Rápidos</h3>
                    <Button variant="ghost" size="icon" className="text-gold hover:bg-navy-light" onClick={() => setIsFloatingButtonOpen(false)}>
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {usefulLinks.map(link => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block text-white hover:text-gold transition-colors p-2 hover:bg-navy-light rounded">
                        {link.title}
                      </a>)}
                  </div>
                </div> : null}
              
              <Button size="icon" className="h-12 w-12 rounded-full bg-gold hover:bg-gold-light text-navy shadow-lg" onClick={() => setIsFloatingButtonOpen(!isFloatingButtonOpen)}>
                {isFloatingButtonOpen ? <X size={20} /> : <Plus size={20} />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>;
};

export default AccountingSection;
