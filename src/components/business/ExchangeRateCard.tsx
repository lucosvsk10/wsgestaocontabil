import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, TrendingUp, DollarSign, Euro, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
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
const ExchangeRateCard = ({
  exchangeRates,
  onRefresh,
  isRefreshing
}: ExchangeRateCardProps) => {
  const isMobile = useIsMobile();
  const formatCurrency = (value: number): string => {
    return value.toFixed(4);
  };
  return <Card className="border-gold/30 text-navy dark:text-white bg-deepNavy-90">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <TrendingUp className="text-gold" />
            <span className="font-extralight">Cotações do Dia</span>
          </CardTitle>
          <CardDescription className="text-navy/70 dark:text-white/70">
            Atualizado em {new Date().toLocaleDateString('pt-BR')}
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="border-gold/30 text-gold hover:text-white bg-white/50 dark:bg-gold-dark">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar cotações</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isMobile ? <div className="space-y-4">
            {exchangeRates.map(rate => <div key={rate.code} className="p-4 bg-white/50 dark:bg-navy-light/50 rounded-lg border border-gold/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rate.code.includes('USD') && <DollarSign className="w-4 h-4 text-gold" />}
                    {rate.code.includes('EUR') && <Euro className="w-4 h-4 text-gold" />}
                    {rate.code.includes('BRL/') && <span className="text-gold font-bold">R$</span>}
                    <span className="font-medium">{rate.name}</span>
                  </div>
                  <span className={rate.change >= 0 ? "text-green-400" : "text-red-400"}>
                    <div className="flex items-center gap-1">
                      {rate.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(rate.change * 100).toFixed(2)}%
                    </div>
                  </span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(rate.rate)}</div>
              </div>)}
          </div> : <Table>
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
          </Table>}
      </CardContent>
    </Card>;
};
export default ExchangeRateCard;