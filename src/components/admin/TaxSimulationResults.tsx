
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { currencyFormat } from "@/utils/taxCalculations";
import { 
  ChartPie, 
  Search, 
  User, 
  Filter, 
  FileText, 
  Download, 
  BarChart2,
  Calendar,
  ArrowDownUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TaxSimulation {
  id: string;
  user_id: string | null;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  imposto_estimado: number;
  tipo_simulacao: string;
  data_criacao: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  observacoes?: string;
}

interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

const TaxSimulationResults = () => {
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
  const [selectedSimulation, setSelectedSimulation] = useState<TaxSimulation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isObservationsOpen, setIsObservationsOpen] = useState(false);
  const [observationText, setObservationText] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  
  const { toast } = useToast();

  // Chart data for analytics tab
  const chartData = useMemo(() => {
    if (!simulations.length) return [];
    
    // Declaration type distribution
    const typeDistribution = [
      { name: 'Completa', value: simulations.filter(s => s.tipo_simulacao.includes('completa')).length },
      { name: 'Simplificada', value: simulations.filter(s => s.tipo_simulacao.includes('simplificada')).length }
    ];
    
    // Tax result distribution
    const resultDistribution = [
      { name: 'A Pagar', value: simulations.filter(s => s.tipo_simulacao === 'a pagar').length },
      { name: 'Restituição', value: simulations.filter(s => s.tipo_simulacao === 'restituição').length }
    ];
    
    // Income range distribution
    const incomeRanges = [
      { range: 'Até 50 mil', count: 0 },
      { range: '50-100 mil', count: 0 },
      { range: '100-200 mil', count: 0 },
      { range: '200+ mil', count: 0 }
    ];
    
    simulations.forEach(sim => {
      if (sim.rendimento_bruto < 50000) incomeRanges[0].count++;
      else if (sim.rendimento_bruto < 100000) incomeRanges[1].count++;
      else if (sim.rendimento_bruto < 200000) incomeRanges[2].count++;
      else incomeRanges[3].count++;
    });
    
    return {
      typeDistribution,
      resultDistribution,
      incomeRanges
    };
  }, [simulations]);

  useEffect(() => {
    fetchSimulations();
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

  useEffect(() => {
    if (simulations.length > 0) {
      // Apply filters
      let results = [...simulations];
      
      // Search filter
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
      
      // Time filter
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
          const simDate = new Date(sim.data_criacao);
          return simDate >= past && simDate <= now;
        });
      }
      
      // Type filter
      if (typeFilter !== "all") {
        results = results.filter(sim => {
          if (typeFilter === "pagar") return sim.tipo_simulacao === "a pagar";
          if (typeFilter === "restituir") return sim.tipo_simulacao === "restituição";
          return sim.tipo_simulacao.includes(typeFilter);
        });
      }
      
      // Sort results
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
        
        // Default to date sorting
        const aDate = new Date(a.data_criacao).getTime();
        const bDate = new Date(b.data_criacao).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      });
      
      setFilteredSimulations(results);
    }
  }, [searchTerm, simulations, userDetails, timeFilter, typeFilter, sortConfig]);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from("tax_simulations").select("*").order("data_criacao", {
        ascending: false
      });
      if (error) {
        throw error;
      }
      if (data) {
        setSimulations(data);
        setFilteredSimulations(data);

        // Buscar detalhes dos usuários
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
      const {
        data,
        error
      } = await supabase.from("users").select("id, name, email").in("id", userIds);
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

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      });
    } catch {
      return "Data inválida";
    }
  };

  const getUserName = (simulation: TaxSimulation) => {
    if (simulation.user_id && userDetails[simulation.user_id]?.name) {
      return userDetails[simulation.user_id].name;
    }
    return simulation.nome || "Anônimo";
  };

  const getUserEmail = (simulation: TaxSimulation) => {
    if (simulation.user_id && userDetails[simulation.user_id]?.email) {
      return userDetails[simulation.user_id].email;
    }
    return simulation.email || "N/A";
  };

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortDirection = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
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
      
      // Update local state
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
      
      // Add header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(11, 19, 32); // Cor navy
      doc.text("WS Gestão Contábil", 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("Relatório de Simulação de IRPF", 105, 30, { align: "center" });
      
      // Add simulation info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // User info
      doc.setFont("helvetica", "bold");
      doc.text("Informações do Contribuinte", 20, 45);
      doc.setFont("helvetica", "normal");
      
      const userName = getUserName(simulation);
      const userEmail = getUserEmail(simulation);
      
      doc.text(`Nome: ${userName}`, 20, 55);
      doc.text(`Email: ${userEmail}`, 20, 63);
      if (simulation.telefone) {
        doc.text(`Telefone: ${simulation.telefone}`, 20, 71);
      }
      doc.text(`Data da simulação: ${formatDate(simulation.data_criacao)}`, 20, 79);
      
      // Simulation details
      doc.setFont("helvetica", "bold");
      doc.text("Detalhes da Declaração", 20, 95);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Tipo de declaração: ${simulation.tipo_simulacao}`, 20, 105);
      doc.text(`Rendimento bruto anual: ${currencyFormat(simulation.rendimento_bruto)}`, 20, 113);
      doc.text(`Contribuição INSS: ${currencyFormat(simulation.inss)}`, 20, 121);
      doc.text(`Despesas com educação: ${currencyFormat(simulation.educacao)}`, 20, 129);
      doc.text(`Despesas médicas: ${currencyFormat(simulation.saude)}`, 20, 137);
      doc.text(`Dependentes: ${simulation.dependentes} (${currencyFormat(simulation.dependentes * 2275.08)})`, 20, 145);
      doc.text(`Outras deduções: ${currencyFormat(simulation.outras_deducoes)}`, 20, 153);
      
      // Total deductions
      const totalDeducoes = simulation.inss + simulation.educacao + simulation.saude + simulation.dependentes * 2275.08 + simulation.outras_deducoes;
      
      doc.setFont("helvetica", "bold");
      doc.text(`Total de deduções: ${currencyFormat(totalDeducoes)}`, 20, 165);
      
      // Result
      doc.setFont("helvetica", "bold");
      doc.text("Resultado", 20, 180);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Base de cálculo: ${currencyFormat(simulation.rendimento_bruto - totalDeducoes)}`, 20, 190);
      
      doc.setFont("helvetica", "bold");
      const resultColor = simulation.tipo_simulacao === 'a pagar' ? [220, 50, 50] : [0, 150, 50]; // Vermelho ou Verde
      doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
      doc.text(`Imposto ${simulation.tipo_simulacao}: ${currencyFormat(simulation.imposto_estimado)}`, 20, 200);
      
      // Footer
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Este documento é apenas uma simulação e não substitui a declaração oficial do IRPF.", 105, 280, { align: "center" });
      
      // Save PDF
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
      
      // Prepare CSV header
      const headers = [
        "ID",
        "Nome",
        "Email",
        "Telefone",
        "Data",
        "Tipo",
        "Rendimento Bruto",
        "INSS",
        "Educação",
        "Saúde",
        "Dependentes",
        "Valor Dependentes",
        "Outras Deduções",
        "Total Deduções",
        "Imposto Estimado"
      ];
      
      // Prepare CSV rows
      const csvData = filteredSimulations.map(sim => {
        const valorDependentes = sim.dependentes * 2275.08;
        const totalDeducoes = sim.inss + sim.educacao + sim.saude + valorDependentes + sim.outras_deducoes;
        
        return [
          sim.id,
          getUserName(sim),
          getUserEmail(sim),
          sim.telefone || "N/A",
          formatDate(sim.data_criacao),
          sim.tipo_simulacao,
          sim.rendimento_bruto,
          sim.inss,
          sim.educacao,
          sim.saude,
          sim.dependentes,
          valorDependentes,
          sim.outras_deducoes,
          totalDeducoes,
          sim.imposto_estimado
        ];
      });
      
      // Combine header and rows
      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");
      
      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `simulacoes-irpf-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      
      // Trigger download and cleanup
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>;
  }

  return <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-navy dark:text-gold">
            Gerenciamento de Simulações de IRPF
          </h2>
          <p className="text-muted-foreground dark:text-gray-300">
            Acompanhe e analise todas as simulações realizadas pelos usuários
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={exportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 mb-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Simulações</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Análise</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
              <Input 
                type="search" 
                placeholder="Buscar por nome, email..." 
                className="pl-8 bg-white dark:bg-navy-medium border-gray-200 dark:border-navy-lighter/30 rounded-lg" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo de Declaração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagar">A Pagar</SelectItem>
                  <SelectItem value="restituir">Restituição</SelectItem>
                  <SelectItem value="completa">Modelo Completo</SelectItem>
                  <SelectItem value="simplificada">Modelo Simplificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredSimulations.length === 0 ? <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-medium">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <ChartPie className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2 dark:text-white">Nenhuma simulação encontrada</p>
                <p className="text-muted-foreground dark:text-gray-300 text-center max-w-md">
                  {searchTerm || timeFilter !== "all" || typeFilter !== "all" ? 
                    "Nenhuma simulação corresponde aos filtros aplicados." : 
                    "Ainda não há simulações de imposto de renda registradas."}
                </p>
              </CardContent>
            </Card> : <div className="space-y-6">
              <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="dark:text-gold">Resumo</CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Total de {filteredSimulations.length} simulação(ões) encontrada(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
                      <p className="text-sm font-medium mb-1 dark:text-gray-300">A Pagar</p>
                      <p className="text-xl font-bold text-red-500 dark:text-red-400">
                        {filteredSimulations.filter(s => s.tipo_simulacao === "a pagar").length}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
                      <p className="text-sm font-medium mb-1 dark:text-gray-300">Restituição</p>
                      <p className="text-xl font-bold text-green-500 dark:text-green-400">
                        {filteredSimulations.filter(s => s.tipo_simulacao === "restituição").length}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
                      <p className="text-sm font-medium mb-1 dark:text-gray-300">Valor Médio</p>
                      <p className="text-xl font-bold dark:text-white">
                        {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0) / filteredSimulations.length)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
                      <p className="text-sm font-medium mb-1 dark:text-gray-300">Rendimento Médio</p>
                      <p className="text-xl font-bold dark:text-white">
                        {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.rendimento_bruto, 0) / filteredSimulations.length)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-lighter/30 shadow-md">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-navy-dark">
                    <TableRow className="hover:bg-gray-100 dark:hover:bg-navy-medium/50">
                      <TableHead 
                        className="dark:text-gray-300 cursor-pointer"
                        onClick={() => requestSort('data_criacao')}
                      >
                        Data {getSortDirection('data_criacao')}
                      </TableHead>
                      <TableHead 
                        className="dark:text-gray-300 cursor-pointer"
                        onClick={() => requestSort('nome')}
                      >
                        Nome {getSortDirection('nome')}
                      </TableHead>
                      <TableHead 
                        className="dark:text-gray-300 cursor-pointer"
                        onClick={() => requestSort('rendimento_bruto')}
                      >
                        Rendimento {getSortDirection('rendimento_bruto')}
                      </TableHead>
                      <TableHead className="dark:text-gray-300">Deduções</TableHead>
                      <TableHead 
                        className="dark:text-gray-300 cursor-pointer"
                        onClick={() => requestSort('imposto_estimado')}
                      >
                        Resultado {getSortDirection('imposto_estimado')}
                      </TableHead>
                      <TableHead className="dark:text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:bg-navy-medium">
                    {filteredSimulations.map(simulation => {
                  const totalDeducoes = simulation.inss + simulation.educacao + simulation.saude + simulation.dependentes * 2275.08 + simulation.outras_deducoes;
                  return <TableRow key={simulation.id} className="hover:bg-gray-50 dark:hover:bg-navy-dark">
                          <TableCell className="dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-navy dark:text-gray-400" />
                              {formatDate(simulation.data_criacao)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-dark flex items-center justify-center border border-gray-200 dark:border-navy-lighter/30">
                                <User className="h-4 w-4 text-navy dark:text-gold" />
                              </div>
                              <div>
                                <div className="font-medium dark:text-white">
                                  {getUserName(simulation)}
                                  {simulation.user_id && <Badge className="ml-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-xs hover:bg-blue-100">
                                      Cliente
                                    </Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground dark:text-gray-400">
                                  {getUserEmail(simulation)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {currencyFormat(simulation.rendimento_bruto)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm dark:text-gray-300">
                              <p>Total: {currencyFormat(totalDeducoes)}</p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">
                                INSS: {currencyFormat(simulation.inss)}, 
                                Saúde: {currencyFormat(simulation.saude)}, 
                                Educação: {currencyFormat(simulation.educacao)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium ${simulation.tipo_simulacao === 'a pagar' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                              {currencyFormat(simulation.imposto_estimado)}
                              <Badge className={`ml-1 text-xs ${
                                simulation.tipo_simulacao === 'a pagar' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 hover:bg-red-100' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 hover:bg-green-100'
                              }`}>
                                {simulation.tipo_simulacao}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ArrowDownUp className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => viewDetails(simulation)}>
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generatePDF(simulation)}>
                                  Exportar PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openObservations(simulation)}>
                                  Adicionar observações
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>;
                })}
                  </TableBody>
                  <TableFooter className="bg-gray-50 dark:bg-navy-dark">
                    <TableRow>
                      <TableCell colSpan={3} className="dark:text-white">Total</TableCell>
                      <TableCell className="dark:text-white">
                        {currencyFormat(filteredSimulations.reduce((acc, sim) => {
                          const totalDeductions = sim.inss + sim.educacao + sim.saude + sim.dependentes * 2275.08 + sim.outras_deducoes;
                          return acc + totalDeductions;
                        }, 0))}
                      </TableCell>
                      <TableCell className="dark:text-white">
                        {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0))}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Distribution charts */}
            <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
              <CardHeader>
                <CardTitle className="dark:text-gold">Distribuição por Modelo de Declaração</CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Proporção de declarações com modelo completo vs simplificado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  {chartData.typeDistribution && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.typeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
              <CardHeader>
                <CardTitle className="dark:text-gold">A Pagar vs Restituição</CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Quantidade de simulações com imposto a pagar ou a restituir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  {chartData.resultDistribution && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.resultDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#FF8042" />
                          <Cell fill="#00C49F" />
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Bar chart for income distribution */}
            <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark xl:col-span-2">
              <CardHeader>
                <CardTitle className="dark:text-gold">Distribuição por Faixa de Renda</CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Quantidade de simulações por faixa de rendimento anual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  {chartData.incomeRanges && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.incomeRanges}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                        <Legend />
                        <Bar dataKey="count" name="Simulações" fill="#F5C441" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Simulation Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedSimulation && (
            <>
              <DialogHeader>
                <DialogTitle className="text-navy dark:text-gold text-xl">
                  Detalhes da Simulação
                </DialogTitle>
                <DialogDescription className="dark:text-gray-300">
                  Simulação realizada em {formatDate(selectedSimulation.data_criacao)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-navy dark:text-gold">Dados do Contribuinte</h4>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-navy dark:text-gold" />
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">Nome:</p>
                          <p className="font-medium dark:text-white">{getUserName(selectedSimulation)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Email:</p>
                        <p className="dark:text-white">{getUserEmail(selectedSimulation)}</p>
                      </div>
                      {selectedSimulation.telefone && (
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">Telefone:</p>
                          <p className="dark:text-white">{selectedSimulation.telefone}</p>
                        </div>
                      )}
                      {selectedSimulation.user_id && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          Cliente registrado
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-navy dark:text-gold">Resultado da Simulação</h4>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4 space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Tipo de declaração:</p>
                        <p className="font-medium dark:text-white">{selectedSimulation.tipo_simulacao}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Rendimento Bruto:</p>
                        <p className="font-medium dark:text-white">{currencyFormat(selectedSimulation.rendimento_bruto)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Imposto:</p>
                        <p className={`font-medium ${selectedSimulation.tipo_simulacao === 'a pagar' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                          {currencyFormat(selectedSimulation.imposto_estimado)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy dark:text-gold">Deduções Detalhadas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">INSS:</p>
                      <p className="font-medium dark:text-white">{currencyFormat(selectedSimulation.inss)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">Despesas com Saúde:</p>
                      <p className="font-medium dark:text-white">{currencyFormat(selectedSimulation.saude)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">Despesas com Educação:</p>
                      <p className="font-medium dark:text-white">{currencyFormat(selectedSimulation.educacao)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">Dependentes:</p>
                      <p className="font-medium dark:text-white">{selectedSimulation.dependentes} ({currencyFormat(selectedSimulation.dependentes * 2275.08)})</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">Outras Deduções:</p>
                      <p className="font-medium dark:text-white">{currencyFormat(selectedSimulation.outras_deducoes)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">Total de Deduções:</p>
                      <p className="font-medium dark:text-white">
                        {currencyFormat(
                          selectedSimulation.inss + 
                          selectedSimulation.saude + 
                          selectedSimulation.educacao + 
                          (selectedSimulation.dependentes * 2275.08) + 
                          selectedSimulation.outras_deducoes
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-navy dark:text-gold">Observações</h4>
                  <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                    {selectedSimulation.observacoes ? (
                      <p className="dark:text-white">{selectedSimulation.observacoes}</p>
                    ) : (
                      <p className="text-muted-foreground dark:text-gray-400 italic">
                        Nenhuma observação adicionada.
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => generatePDF(selectedSimulation)}
                    className="bg-gold hover:bg-gold/90 text-black"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Observations Dialog */}
      <Dialog open={isObservationsOpen} onOpenChange={setIsObservationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy dark:text-gold">
              Adicionar Observações
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              Adicione notas ou observações internas sobre esta simulação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea
              placeholder="Digite suas observações aqui..."
              className="min-h-[100px] dark:bg-navy-dark dark:border-navy-lighter/30"
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
            />
          </div>
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsObservationsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveObservations}
              className="bg-gold hover:bg-gold/90 text-black"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

export default TaxSimulationResults;
