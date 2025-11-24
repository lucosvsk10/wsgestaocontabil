import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtratoBancario } from '@/types/conciliacao';
import { CheckCircle, Clock } from 'lucide-react';
import { useDrop } from 'react-dnd';
import { useConciliacaoManual } from '@/hooks/conciliacao/useConciliacaoManual';

interface ExtratoListProps {
  extratos: ExtratoBancario[];
  onRefetch: () => void;
}

export const ExtratoList = ({ extratos, onRefetch }: ExtratoListProps) => {
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-light">Extrato Bancário</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {extratos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada para esta competência
          </p>
        ) : (
          extratos.map(extrato => (
            <ExtratoItem 
              key={extrato.id} 
              extrato={extrato}
              onRefetch={onRefetch}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

interface ExtratoItemProps {
  extrato: ExtratoBancario;
  onRefetch: () => void;
}

const ExtratoItem = ({ extrato, onRefetch }: ExtratoItemProps) => {
  const { vincularDocumento } = useConciliacaoManual(onRefetch);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'documento',
    drop: (item: { id: string }) => vincularDocumento(extrato.id, item.id),
    canDrop: () => extrato.status === 'pendente',
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  const isConciliado = extrato.status === 'conciliado';

  return (
    <div
      ref={drop}
      className={`
        p-4 rounded-lg border transition-all
        ${isConciliado 
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
          : 'bg-card border-border'
        }
        ${isOver && !isConciliado ? 'ring-2 ring-primary bg-primary/10' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isConciliado ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
            <p className="font-medium text-sm">
              {new Date(extrato.data_transacao).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {extrato.descricao}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${
            extrato.valor >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(extrato.valor)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isConciliado ? 'Conciliado' : 'Pendente'}
          </p>
        </div>
      </div>
    </div>
  );
};
