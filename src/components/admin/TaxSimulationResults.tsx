import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { TaxSimulation } from "@/types/taxSimulation";

// Importações dos componentes refatorados
import { SimulationTabsView } from "./simulation/SimulationTabsView";
import { HeaderActions } from "./simulation/HeaderActions";
import { SimulationContent } from "./simulation/SimulationContent";
import { AnalyticsCharts } from "./simulation/AnalyticsCharts";
import { SimulationDetailsDialog } from "./simulation/SimulationDetailsDialog";
import { ObservationsDialog } from "./simulation/ObservationsDialog";

// Tipos
interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

const TaxSimulationResults = () => {
  // Estado para armazenar dados
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<TaxSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails>({});
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: string}>({
    key: "data_criacao",
    direction: "desc"
  });

  // Estado para diálogos e tabs
  const [selectedSimulation, setSelectedSimulation] = useState<TaxSimulation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isObservationsOpen, setIsObservationsOpen] = useState(false);
  const [observationText, setObservationText] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  
  const { toast } = useToast();

  // Efeitos para buscar dados
  useEffect(() => {
    fetchSimulations();
    // Configuração do canal em tempo real para atualizações
    const subscription = supabase.channel('tax_simulations_changes').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'tax_simulations'
    }, () => {
      fetchSimulations();
    }).subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efeito para filtrar simulações quando os dados são alterados
  useEffect(() => {
    if (simulations.length > 0) {
      let results = [...simulations];
      
      // Filtra por termo de pesquisa
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        results = results.filter(sim => {
          const userEmail = userDetails[sim.user_id || '']?.email?.toLowerCase() || '';
          const userName = userDetails[sim.user_id || '']?.name?.toLowerCase() || '';
          const simulationName = (sim.nome || '').toLowerCase();
          const simulationEmail = (sim.email || '').toLowerCase();
          const simulationPhone = (sim.telefone || '').toLowerCase();
          
          return (
            simulationName.includes(searchLower) || 
            simulationEmail.includes(searchLower) || 
            simulationPhone.includes(searchLower) || 
            userEmail.includes(searchLower) || 
            userName.includes(searchLower) || 
            sim.tipo_simulacao.includes(searchLower)
          );
        });
      }
      
      // Filtra por período
      if (timeFilter !== "all") {
        const now = new Date();
        const past = new Date();
        
        switch (timeFilter) {
          case "week":
            past.setDate(past.getDate() - 7);
            break;
          case "month":
            past.setMonth(past.getMonth() - 1);
            break;
          case "quarter":
            past.setMonth(past.getMonth() - 3);
            break;
          case "year":
            past.setFullYear(past.getFullYear() - 1);
            break;
        }
        
        results = results.filter(sim => {
          const simDate = new Date(sim.data_criacao || '');
          return simDate >= past && simDate <= now;
        });
      }
      
      // Filtra por tipo
      if (typeFilter !== "all") {
        results = results.filter(sim => {
          if (typeFilter === "pagar") return sim.tipo_simulacao === "a pagar";
          if (typeFilter === "restituir") return sim.tipo_simulacao === "restituição";
          return sim.tipo_simulacao.includes(typeFilter);
        });
      }
      
      // Ordenação
      results.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof TaxSimulation];
        const bValue = b[sortConfig.key as keyof TaxSimulation];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        
        const aDate = new Date(a.data_criacao || '').getTime();
        const bDate = new Date(b.data_criacao || '').getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      });
      
      setFilteredSimulations(results);
    }
  }, [searchTerm, simulations, userDetails, timeFilter, typeFilter, sortConfig]);

  // Funções para buscar dados
  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("tax_simulations").select("*").order("data_criacao", {
        ascending: false
      });
      if (error) {
        throw error;
      }
      if (data) {
        setSimulations(data);
        setFilteredSimulations(data);

        const userIds = [...new Set(data.map(sim => sim.user_id).filter(Boolean))];
        fetchUserDetails(userIds as string[]);
      }
    } catch (error) {
      console.error("Erro ao buscar simulações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as simulações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      const { data, error } = await supabase.from("users").select("id, name, email").in("id", userIds);
      if (error) {
        throw error;
      }
      if (data) {
        const userMap: UserDetails = {};
        data.forEach(user => {
          userMap[user.id] = {
            name: user.name,
            email: user.email
          };
        });
        setUserDetails(userMap);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes dos usuários:", error);
    }
  };

  // Manipuladores de eventos
  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const viewDetails = (simulation: TaxSimulation) => {
    setSelectedSimulation(simulation);
    setIsDetailsOpen(true);
  };

  const openObservations = (simulation: TaxSimulation) => {
    setSelectedSimulation(simulation);
    setObservationText(simulation.observacoes || '');
    setIsObservationsOpen(true);
  };

  const saveObservations = async () => {
    if (!selectedSimulation) return;
    
    try {
      const { error } = await supabase
        .from('tax_simulations')
        .update({ observacoes: observationText })
        .eq('id', selectedSimulation.id);
        
      if (error) throw error;
      
      setSimulations(prevSimulations => 
        prevSimulations.map(sim => 
          sim.id === selectedSimulation.id 
            ? { ...sim, observacoes: observationText } 
            : sim
        )
      );
      
      toast({
        title: "Sucesso",
        description: "Observações salvas com sucesso.",
      });
      
      setIsObservationsOpen(false);
    } catch (error) {
      console.error("Erro ao salvar observações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as observações.",
        variant: "destructive"
      });
    }
  };

  const generatePDF = (simulation: TaxSimulation) => {
    try {
      const doc = new jsPDF();
      
      // Cabeçalho do PDF
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(11, 19, 32);
      doc.text("WS Gestão Contábil", 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("Relatório de Simulação de IRPF", 105, 30, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Dados do contribuinte
      doc.setFont("helvetica", "bold");
      doc.text("Informações do Contribuinte", 20, 45);
      doc.setFont("helvetica", "normal");
      
      const userName = selectedSimulation?.user_id && userDetails[selectedSimulation.user_id]?.name 
        ? userDetails[selectedSimulation.user_id].name 
        : simulation.nome || "Anônimo";
      
      const userEmail = selectedSimulation?.user_id && userDetails[selectedSimulation.user_id]?.email 
        ? userDetails[selectedSimulation.user_id].email 
        : simulation.email || "N/A";
      
      doc.text(`Nome: ${userName}`, 20, 55);
      doc.text(`Email: ${userEmail}`, 20, 63);
      if (simulation.telefone) {
        doc.text(`Telefone: ${simulation.telefone}`, 20, 71);
      }
      doc.text(`Data da simulação: ${new Date(simulation.data_criacao || '').toLocaleDateString()}`, 20, 79);
      
      // Detalhes da declaração
      doc.setFont("helvetica", "bold");
      doc.text("Detalhes da Declaração", 20, 95);
      doc.setFont("helvetica", "normal");
      
      // Adiciona conteúdo ao PDF
      // Versão simplificada para manter o código conciso
      autoTable(doc, {
        startY: 105,
        head: [['Item', 'Valor']],
        body: [
          ['Tipo de declaração', simulation.tipo_simulacao],
          ['Rendimento bruto anual', `R$ ${simulation.rendimento_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Contribuição INSS', `R$ ${simulation.inss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Despesas com educação', `R$ ${(simulation.educacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Despesas médicas', `R$ ${(simulation.saude || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Dependentes', `${simulation.dependentes} (R$ ${((simulation.dependentes || 0) * 2275.08).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`],
          ['Outras deduções', `R$ ${(simulation.outras_deducoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ],
      });
      
      // Rodapé
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Este documento é apenas uma simulação e não substitui a declaração oficial do IRPF.", 105, 280, { align: "center" });
      
      doc.save(`simulacao-irpf-${userName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive"
      });
    }
  };

  const exportCSV = () => {
    try {
      if (filteredSimulations.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há dados para exportar.",
          variant: "destructive"
        });
        return;
      }
      
      // Cria cabeçalhos para CSV
      const headers = [
        "ID", "Nome", "Email", "Telefone", "Data", "Tipo", 
        "Rendimento Bruto", "INSS", "Educação", "Saúde", 
        "Dependentes", "Valor Dependentes", "Outras Deduções", 
        "Total Deduções", "Imposto Estimado"
      ];
      
      // Prepara dados
      const csvData = filteredSimulations.map(sim => {
        const valorDependentes = (sim.dependentes || 0) * 2275.08;
        const totalDeducoes = sim.inss + (sim.educacao || 0) + (sim.saude || 0) + valorDependentes + (sim.outras_deducoes || 0);
        
        const userName = sim.user_id && userDetails[sim.user_id]?.name 
          ? userDetails[sim.user_id].name 
          : sim.nome || "Anônimo";
          
        const userEmail = sim.user_id && userDetails[sim.user_id]?.email 
          ? userDetails[sim.user_id].email 
          : sim.email || "N/A";
        
        return [
          sim.id,
          userName,
          userEmail,
          sim.telefone || "N/A",
          new Date(sim.data_criacao || '').toLocaleString('pt-BR'),
          sim.tipo_simulacao,
          sim.rendimento_bruto,
          sim.inss,
          sim.educacao || 0,
          sim.saude || 0,
          sim.dependentes || 0,
          valorDependentes,
          sim.outras_deducoes || 0,
          totalDeducoes,
          sim.imposto_estimado
        ];
      });
      
      // Gera conteúdo CSV
      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");
      
      // Cria o blob e inicia o download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `simulacoes-irpf-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Sucesso",
        description: "Arquivo CSV exportado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o CSV.",
        variant: "destructive"
      });
    }
  };

  // Componente de loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-navy dark:text-gold">
            Gerenciamento de Simulações de IRPF
          </h2>
          <p className="text-muted-foreground dark:text-gray-300">
            Acompanhe e analise todas as simulações realizadas pelos usuários
          </p>
        </div>
        
        <HeaderActions onExportCSV={exportCSV} />
      </div>
      
      <SimulationTabsView activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "list" && (
          <div className="space-y-6">
            <SimulationContent 
              filteredSimulations={filteredSimulations}
              searchTerm={searchTerm}
              timeFilter={timeFilter}
              typeFilter={typeFilter}
              sortConfig={sortConfig}
              userDetails={userDetails}
              onSearchChange={setSearchTerm}
              onTimeFilterChange={setTimeFilter}
              onTypeFilterChange={setTypeFilter}
              onRequestSort={requestSort}
              onViewDetails={viewDetails}
              onGeneratePDF={generatePDF}
              onOpenObservations={openObservations}
            />
          </div>
        )}
        
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <AnalyticsCharts simulations={simulations} />
          </div>
        )}
      </SimulationTabsView>
      
      <SimulationDetailsDialog
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        simulation={selectedSimulation}
        userDetails={userDetails}
        onGeneratePDF={generatePDF}
      />
      
      <ObservationsDialog
        isOpen={isObservationsOpen}
        onOpenChange={setIsObservationsOpen}
        simulation={selectedSimulation}
        observationText={observationText}
        onObservationTextChange={setObservationText}
        onSaveObservations={saveObservations}
      />
    </div>
  );
};

export default TaxSimulationResults;
