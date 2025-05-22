import { useEffect, useState } from 'react';
import ExchangeRateCard from './business/ExchangeRateCard';
import NewsCard from './business/NewsCard';
import LoadingState from './business/LoadingState';
import ErrorState from './business/ErrorState';
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
  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorState error={error} />;
  }
  return <section id="noticias" className="py-8 md:py-16 bg-orange-200 dark:bg-navy-dark">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl text-navy-light dark:text-gold text-center mb-8 font-light">
          Notícias do Mundo de Negócios
        </h2>
        
        <div className="grid grid-cols-1 gap-6 md:gap-8">
          <ExchangeRateCard exchangeRates={exchangeRates} onRefresh={handleRefreshRates} isRefreshing={refreshingRates} />
          <NewsCard news={news} onRefresh={handleRefreshNews} isRefreshing={refreshingNews} />
        </div>
      </div>
    </section>;
};
export default BusinessNews;