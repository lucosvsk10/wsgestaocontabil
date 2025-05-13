import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { currencyFormat } from "@/utils/taxCalculations";
import { ChartPie, Search, User } from "lucide-react";

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
}

interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  }
}

const TaxSimulationResults = () => {
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<TaxSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSimulations();

    const subscription = supabase
      .channel('tax_simulations_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'tax_simulations' 
      }, () => {
        fetchSimulations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (simulations.length > 0) {
      const results = simulations.filter(sim => {
        const searchLower = searchTerm.toLowerCase();
        
        // Verificar nos dados do usuário armazenados
        const userEmail = userDetails[sim.user_id || '']?.email?.toLowerCase() || '';
        const userName = userDetails[sim.user_id || '']?.name?.toLowerCase() || '';
        
        // Verificar nos campos da simulação
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
      
      setFilteredSimulations(results);
    }
  }, [searchTerm, simulations, userDetails]);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tax_simulations")
        .select("*")
        .order("data_criacao", { ascending: false });

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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

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
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
            Simulações de Imposto de Renda
          </h2>
          <p className="text-muted-foreground dark:text-gray-300">
            Visualize todas as simulações feitas pelos usuários
          </p>
        </div>
        
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por nome, email..."
            className="pl-8 bg-white dark:bg-navy-medium border-gray-200 dark:border-navy-lighter/30 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredSimulations.length === 0 ? (
        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-medium">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <ChartPie className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2 dark:text-white">Nenhuma simulação encontrada</p>
            <p className="text-muted-foreground dark:text-gray-300 text-center max-w-md">
              {searchTerm ? 
                "Nenhuma simulação corresponde aos termos de busca." : 
                "Ainda não há simulações de imposto de renda registradas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-medium">
            <CardHeader className="pb-3">
              <CardTitle className="dark:text-gold">Resumo</CardTitle>
              <CardDescription className="dark:text-gray-300">
                Total de {filteredSimulations.length} simulação(ões) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {currencyFormat(
                      filteredSimulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0) / 
                      filteredSimulations.length
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-lighter/30 shadow-md">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-navy-dark">
                <TableRow className="hover:bg-gray-100 dark:hover:bg-navy-medium/50">
                  <TableHead className="dark:text-gray-300">Data</TableHead>
                  <TableHead className="dark:text-gray-300">Nome</TableHead>
                  <TableHead className="dark:text-gray-300">Contato</TableHead>
                  <TableHead className="dark:text-gray-300">Rendimento</TableHead>
                  <TableHead className="dark:text-gray-300">Deduções</TableHead>
                  <TableHead className="dark:text-gray-300">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:bg-navy-medium">
                {filteredSimulations.map((simulation) => {
                  const totalDeducoes = 
                    simulation.inss + 
                    simulation.educacao + 
                    simulation.saude + 
                    (simulation.dependentes * 2275.08) + 
                    simulation.outras_deducoes;
                  
                  return (
                    <TableRow key={simulation.id} className="hover:bg-gray-50 dark:hover:bg-navy-darker/50">
                      <TableCell className="dark:text-gray-300">
                        {formatDate(simulation.data_criacao)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-dark flex items-center justify-center border border-gray-200 dark:border-navy-lighter/30">
                            <User className="h-4 w-4 text-navy dark:text-gold" />
                          </div>
                          <div className="font-medium dark:text-white">
                            {getUserName(simulation)}
                            {simulation.user_id && (
                              <span className="ml-1 text-xs px-1 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                                Cliente
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm dark:text-gray-300">
                          <p>{getUserEmail(simulation)}</p>
                          {simulation.telefone && <p>{simulation.telefone}</p>}
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
                          {currencyFormat(simulation.imposto_estimado)} ({simulation.tipo_simulacao})
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxSimulationResults;
