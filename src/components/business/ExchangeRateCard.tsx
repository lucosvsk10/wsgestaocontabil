
import React from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExchangeRate {
  code: string;
  name: string;
  rate: number;
  change: number;
}

interface ExchangeRateCardProps {
  exchangeRates: ExchangeRate[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ExchangeRateCard = ({ exchangeRates, onRefresh, isRefreshing }: ExchangeRateCardProps) => {
  return (
    <div className="bg-white dark:bg-deepNavy/60 border border-[#e6e6e6] dark:border-gold/30 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-[#efc349]" />
          <h3 className="text-xl font-semibold text-[#020817] dark:text-gold">Cotações</h3>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exchangeRates.map((rate, index) => (
          <div
            key={index}
            className="bg-white dark:bg-deepNavy/40 border border-[#e6e6e6] dark:border-gold/20 rounded-lg p-4"
          >
            <div className="text-sm text-[#6b7280] dark:text-white/70 mb-1">{rate.name}</div>
            <div className="text-lg font-bold text-[#020817] dark:text-white">{rate.code}</div>
            <div className="text-2xl font-bold text-[#020817] dark:text-gold">
              R$ {rate.rate.toFixed(2)}
            </div>
            <div className={`text-sm font-medium ${
              rate.change >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {rate.change >= 0 ? '+' : ''}{(rate.change * 100).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExchangeRateCard;
