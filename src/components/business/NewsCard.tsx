
import React from 'react';
import { RefreshCw, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const NewsCard = ({ news, onRefresh, isRefreshing }: NewsCardProps) => {
  return (
    <div className="bg-white dark:bg-deepNavy/60 border border-[#e6e6e6] dark:border-gold/30 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-[#efc349]" />
          <h3 className="text-xl font-semibold text-[#020817] dark:text-gold">Notícias</h3>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="border-[#e6e6e6] dark:border-gold/30"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      
      <div className="space-y-4">
        {news.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-deepNavy/40 border border-[#e6e6e6] dark:border-gold/20 rounded-lg p-4"
          >
            <h4 className="text-lg font-semibold text-[#020817] dark:text-white mb-2">
              {item.title}
            </h4>
            <p className="text-[#6b7280] dark:text-white/70 mb-3">
              {item.description}
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563eb] dark:text-[#60a5fa] hover:underline text-sm font-medium"
            >
              Leia mais →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsCard;
