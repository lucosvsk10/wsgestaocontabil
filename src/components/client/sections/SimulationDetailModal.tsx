
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface SimulationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: any;
  onDownload: () => void;
}

export const SimulationDetailModal = ({ isOpen, onClose, simulation, onDownload }: SimulationDetailModalProps) => {
  if (!simulation) return null;

  const getSimulationType = (type: string) => {
    switch (type) {
      case 'tax': return 'IRPF';
      case 'inss': return 'INSS';
      case 'prolabore': return 'Pró-labore';
      default: return 'Simulação';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tax': return 'bg-blue-600 hover:bg-blue-700';
      case 'inss': return 'bg-green-600 hover:bg-green-700';
      case 'prolabore': return 'bg-purple-600 hover:bg-purple-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCreatedDate = (simulation: any) => {
    return simulation.data_criacao || simulation.created_at || '';
  };

  const renderSimulationDetails = () => {
    switch (simulation.type) {
      case 'tax':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nome</p>
                <p className="text-white">{simulation.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{simulation.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Telefone</p>
                <p className="text-white">{simulation.telefone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tipo de Simulação</p>
                <p className="text-white">{simulation.tipo_simulacao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Rendimento Bruto</p>
                <p className="text-white">{formatCurrency(simulation.rendimento_bruto)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">INSS</p>
                <p className="text-white">{formatCurrency(simulation.inss)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Gastos com Educação</p>
                <p className="text-white">{formatCurrency(simulation.educacao || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Gastos com Saúde</p>
                <p className="text-white">{formatCurrency(simulation.saude || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Dependentes</p>
                <p className="text-white">{simulation.dependentes || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Outras Deduções</p>
                <p className="text-white">{formatCurrency(simulation.outras_deducoes || 0)}</p>
              </div>
            </div>
            <div className="bg-[#020817] p-4 rounded-lg border border-[#efc349]/20">
              <p className="text-sm text-gray-400 mb-1">Imposto Estimado</p>
              <p className="text-2xl font-bold text-[#efc349]">{formatCurrency(simulation.imposto_estimado)}</p>
            </div>
          </div>
        );
      case 'inss':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Categoria</p>
                <p className="text-white">{simulation.dados?.categoria || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Alíquota</p>
                <p className="text-white">{simulation.dados?.aliquota || 0}%</p>
              </div>
            </div>
            <div className="bg-[#020817] p-4 rounded-lg border border-[#efc349]/20">
              <p className="text-sm text-gray-400 mb-1">Contribuição INSS</p>
              <p className="text-2xl font-bold text-[#efc349]">{formatCurrency(simulation.dados?.contribuicao || 0)}</p>
            </div>
          </div>
        );
      case 'prolabore':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Valor Bruto</p>
                <p className="text-white">{formatCurrency(simulation.dados?.valorBruto || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">INSS</p>
                <p className="text-white">{formatCurrency(simulation.dados?.inss || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">IRRF</p>
                <p className="text-white">{formatCurrency(simulation.dados?.irrf || 0)}</p>
              </div>
            </div>
            <div className="bg-[#020817] p-4 rounded-lg border border-[#efc349]/20">
              <p className="text-sm text-gray-400 mb-1">Valor Líquido</p>
              <p className="text-2xl font-bold text-[#efc349]">{formatCurrency(simulation.dados?.valorLiquido || 0)}</p>
            </div>
          </div>
        );
      default:
        return <p className="text-gray-400">Detalhes não disponíveis</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0b1320] border-[#efc349]/20 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold text-[#efc349]">
                Detalhes da Simulação
              </DialogTitle>
              <Badge className={`${getTypeColor(simulation.type)} text-white`}>
                {getSimulationType(simulation.type)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-[#efc349]/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Data de Criação</p>
            <p className="text-white">{new Date(getCreatedDate(simulation)).toLocaleString('pt-BR')}</p>
          </div>

          {renderSimulationDetails()}

          <div className="flex gap-3 pt-4 border-t border-[#efc349]/20">
            <Button 
              onClick={onDownload}
              className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
