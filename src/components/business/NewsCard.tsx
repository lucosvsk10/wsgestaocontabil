import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
}
interface NewsCardProps {
  news: NewsItem[];
  onRefresh: () => void;
  isRefreshing: boolean;
}
const NewsCard = ({
  news,
  onRefresh,
  isRefreshing
}: NewsCardProps) => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  return <Card className="bg-white/70 dark:bg-navy-dark border-gold/30 text-navy dark:text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Newspaper className="text-gold" />
            <span className="text-base font-light">Últimas Notícias</span>
          </CardTitle>
          <CardDescription className="text-navy/70 dark:text-white/70">
            Notícias atualizadas diariamente
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="border-gold/30 text-gold hover:text-white bg-white/50 dark:bg-gold-dark">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar notícias</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {news.map((item, index) => <div key={index} className="border-b border-gold/10 pb-4 last:border-0">
              <h3 className="text-base md:text-lg font-medium text-navy-light dark:text-gold mb-2">{item.title}</h3>
              <p className="text-sm md:text-base text-navy/80 dark:text-white/80 mb-2">
                {item.description}
              </p>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-purple hover:text-purple-400 text-sm transition-colors duration-300">
                  Ler mais
                </a>
                <span className="text-navy/60 dark:text-white/60 text-sm">
                  {formatDate(item.publishedAt)}
                </span>
              </div>
            </div>)}
        </div>
      </CardContent>
    </Card>;
};
export default NewsCard;