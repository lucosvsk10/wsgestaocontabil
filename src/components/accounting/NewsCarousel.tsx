import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewsItem } from './types';
interface NewsCarouselProps {
  newsData: NewsItem[];
  isNewsLoading: boolean;
  refreshNews: () => void;
}
const NewsCarousel = ({
  newsData,
  isNewsLoading,
  refreshNews
}: NewsCarouselProps) => {
  return <div className="relative">
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
              <Card className="border-gold/20 h-full bg-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-navy-light dark:text-gold text-xl">{news.title}</CardTitle>
                  <CardDescription className="text-navy/70 dark:text-gray-400 text-xs">{news.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-navy dark:text-gray-300">{news.description}</p>
                </CardContent>
              </Card>
            </CarouselItem>)}
        </CarouselContent>
        <div className="flex justify-center mt-4">
          <CarouselPrevious className="relative static left-0 right-0 mx-2 translate-y-0 bg-white/70 dark:bg-gold-dark" />
          <CarouselNext className="relative static left-0 right-0 mx-0 translate-y-0 bg-white/70 dark:bg-gold-dark" />
        </div>
      </Carousel>
    </div>;
};
export default NewsCarousel;