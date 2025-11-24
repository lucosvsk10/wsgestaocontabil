import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConciliacaoStats } from './conciliacao/ConciliacaoStats';
import { ExtratoList } from './conciliacao/ExtratoList';
import { DocumentUploadArea } from './conciliacao/DocumentUploadArea';
import { useConciliacaoData } from '@/hooks/conciliacao/useConciliacaoData';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const ConciliacaoSection = () => {
  const { user } = useAuth();
  const [competencia, setCompetencia] = useState(getCurrentCompetencia());
  
  const { extratos, documentos, stats, isLoading, refetch } = useConciliacaoData(
    user?.id || '', 
    competencia
  );

  function getCurrentCompetencia() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function generateCompetenciaOptions() {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-light text-foreground">
              Conciliação Bancária
            </h2>
            <Select value={competencia} onValueChange={setCompetencia}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {generateCompetenciaOptions().map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <ConciliacaoStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExtratoList 
            extratos={extratos} 
            onRefetch={refetch}
          />

          <DocumentUploadArea 
            documentos={documentos}
            userId={user?.id || ''}
            competencia={competencia}
            onRefetch={refetch}
          />
        </div>
      </div>
    </DndProvider>
  );
};
