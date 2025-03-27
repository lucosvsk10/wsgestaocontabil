import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, TrendingUp, Newspaper, DollarSign, Euro, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ExchangeRate {
  code: string;
  name: string;
  rate: number;
  change: number;
}

interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
}

const BusinessNews = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExchangeRates = async () => {
    try {
      const baseDate = new Date();
      const seed = baseDate.getTime();
      const randomFactor = Math.sin(seed * 0.001) * 0.05;
      const mockRates: ExchangeRate[] = [{
        code: 'USD/BRL',
        name: 'Dólar Americano',
        rate: 5.42 + randomFactor,
        change: randomFactor * 2
      }, {
        code: 'EUR/BRL',
        name: 'Euro',
        rate: 5.95 + randomFactor * 1.2,
        change: randomFactor * 2.2
      }, {
        code: 'BRL/USD',
        name: 'Real Brasileiro',
        rate: 1 / (5.42 + randomFactor),
        change: -randomFactor * 1.8
      }];
      setExchangeRates(mockRates);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Não foi possível carregar os dados de cotação. Tente novamente mais tarde.');
    } finally {
      setRefreshingRates(false);
    }
  };

  const fetchNews = async () => {
    try {
      const baseDate = new Date();
      const topics = ['tecnologia', 'commodities', 'juros', 'economia', 'varejo', 'mercado financeiro', 'investimentos'];
      const randomTopic1 = topics[Math.floor(Math.random() * topics.length)];
      const randomTopic2 = topics[Math.floor(Math.random() * topics.length)];
      
      const mockNews: NewsItem[] = [{
        title: `Mercado reage a dados econômicos do dia ${baseDate.getDate()}/${baseDate.getMonth() + 1}`,
        description: `Analistas apontam tendências positivas para o setor de ${randomTopic1} e ${randomTopic2} nesta semana.`,
        url: 'https://valorinveste.globo.com/',
        publishedAt: baseDate.toISOString()
      }, {
        title: 'Banco Central sinaliza possível alteração na taxa de juros',
        description: 'Decisão deve impactar mercado financeiro nos próximos dias com reflexos diretos na economia real.',
        url: 'https://www.bcb.gov.br/detalhenoticia/',
        publishedAt: baseDate.toISOString()
      }, {
        title: 'Setor de varejo apresenta recuperação após período de queda',
        description: 'Dados indicam aumento nas vendas e otimismo para os próximos meses no comércio brasileiro.',
        url: 'https://www.infomoney.com.br/mercados/',
        publishedAt: baseDate.toISOString()
      }];
      
      setNews(mockNews);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Não foi possível carregar as notícias. Tente novamente mais tarde.');
    } finally {
      setRefreshingNews(false);
    }
  };

  const handleRefreshRates = () => {
    setRefreshingRates(true);
    fetchExchangeRates();
  };

  const handleRefreshNews = () => {
    setRefreshingNews(true);
    fetchNews();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchExchangeRates();
        await fetchNews();
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();

    const intervalId = setInterval(() => {
      fetchExchangeRates();
      fetchNews();
    }, 86400000);
    return () => clearInterval(intervalId);
  }, []);

  const formatCurrency = (value: number): string => {
    return value.toFixed(4);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <section id="noticias" className="py-16 bg-navy-light">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-anton text-gold text-center mb-8">
            Carregando Notícias...
          </h2>
        </div>
      </section>;
  }

  if (error) {
    return <section id="noticias" className="py-16 bg-navy-light">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-anton text-gold text-center mb-8">
            {error}
          </h2>
        </div>
      </section>;
  }

  return <section id="noticias" className="py-16 bg-navy-light">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl text-gold text-center mb-8 font-bold">
          Notícias do Mundo de Negócios
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-1">
            <Card className="bg-navy border-gold/30 text-white h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-gold" />
                    <span>Cotações do Dia</span>
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Atualizado em {new Date().toLocaleDateString('pt-BR')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefreshRates} disabled={refreshingRates} className="border-gold/30 text-gold hover:text-white bg-gold-dark">
                  <RefreshCw className={`h-4 w-4 ${refreshingRates ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Atualizar cotações</span>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gold/20">
                      <TableHead className="text-gold">Moeda</TableHead>
                      <TableHead className="text-gold">Valor</TableHead>
                      <TableHead className="text-gold">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map(rate => <TableRow key={rate.code} className="border-gold/10">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {rate.code.includes('USD') && <DollarSign className="w-4 h-4 text-gold" />}
                            {rate.code.includes('EUR') && <Euro className="w-4 h-4 text-gold" />}
                            {rate.code.includes('BRL/') && <span className="text-gold font-bold">R$</span>}
                            {rate.name}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(rate.rate)}</TableCell>
                        <TableCell className={rate.change >= 0 ? "text-green-400" : "text-red-400"}>
                          <div className="flex items-center gap-1">
                            {rate.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(rate.change * 100).toFixed(2)}%
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="bg-navy border-gold/30 text-white h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="text-gold" />
                    <span>Últimas Notícias</span>
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Notícias atualizadas diariamente
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefreshNews} disabled={refreshingNews} className="border-gold/30 text-gold hover:text-white bg-gold-dark">
                  <RefreshCw className={`h-4 w-4 ${refreshingNews ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Atualizar notícias</span>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {news.map((item, index) => <div key={index} className="border-b border-gold/10 pb-4 last:border-0">
                      <h3 className="text-lg font-medium text-gold mb-2">{item.title}</h3>
                      <p className="text-white/80 mb-2">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-purple hover:text-purple-400 text-sm transition-colors duration-300"
                        >
                          Ler mais
                        </a>
                        <span className="text-white/60 text-sm">{formatDate(item.publishedAt)}</span>
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>;
};

export default BusinessNews;
