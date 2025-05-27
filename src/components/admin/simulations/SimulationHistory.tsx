
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, User, Edit, Copy, Trash2 } from "lucide-react";

interface SimulationHistoryProps {
  activeCalculator: string;
}

interface SimulationRecord {
  id: string;
  type: "irpf" | "inss" | "prolabore";
  clientName?: string;
  date: string;
  data: Record<string, any>;
  result: Record<string, any>;
}

const SimulationHistory: React.FC<SimulationHistoryProps> = ({ activeCalculator }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - em produção, isso viria do backend
  const mockSimulations: SimulationRecord[] = [
    {
      id: "1",
      type: "irpf",
      clientName: "João Silva",
      date: "2024-12-27T10:30:00Z",
      data: { rendimentoTributavel: 60000, dependentes: 2 },
      result: { impostoDevido: 3500, aliquotaEfetiva: 5.8 }
    },
    {
      id: "2",
      type: "inss",
      clientName: "Maria Santos",
      date: "2024-12-26T14:15:00Z",
      data: { salarioBruto: 5000 },
      result: { totalINSS: 550, aliquotaAplicada: 11 }
    },
    {
      id: "3",
      type: "prolabore",
      clientName: "Pedro Oliveira",
      date: "2024-12-25T09:45:00Z",
      data: { valorBruto: 8000, regimeTributario: "simples" },
      result: { valorLiquido: 7120, inssDescontado: 880 }
    }
  ];

  const filteredSimulations = mockSimulations.filter(sim => {
    const matchesType = activeCalculator === "irpf" ? sim.type === "irpf" : 
                       activeCalculator === "inss" ? sim.type === "inss" :
                       activeCalculator === "prolabore" ? sim.type === "prolabore" : true;
    
    const matchesSearch = sim.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    return matchesType && (searchTerm === "" || matchesSearch);
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "irpf": return "IRPF";
      case "inss": return "INSS";
      case "prolabore": return "Pró-Labore";
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "irpf": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "inss": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "prolabore": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
            Histórico de Simulações
          </CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar por cliente..."
              className="pl-9 font-extralight"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSimulations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-white/70 font-extralight">
              Nenhuma simulação encontrada
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSimulations.map((simulation) => (
              <div
                key={simulation.id}
                className="p-4 border border-gray-200 dark:border-[#efc349]/20 rounded-lg hover:bg-gray-50 dark:hover:bg-[#020817]/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getTypeBadgeColor(simulation.type)} font-extralight`}>
                        {getTypeLabel(simulation.type)}
                      </Badge>
                      {simulation.clientName && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-[#020817] dark:text-white font-extralight">
                            {simulation.clientName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-white/70">
                      <Calendar className="h-4 w-4" />
                      <span className="font-extralight">{formatDate(simulation.date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-extralight"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-extralight"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-extralight"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimulationHistory;
