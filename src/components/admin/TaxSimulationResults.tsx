import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { TaxSimulation, UserDetails } from "@/types/tax-simulations";
import LoadingState from "./tax-simulations/LoadingState";
import EmptyState from "./tax-simulations/EmptyState";
import SimulationsSummary from "./tax-simulations/SimulationsSummary";
import SimulationsTable from "./tax-simulations/SimulationsTable";
import SearchFilter from "./tax-simulations/SearchFilter";
const TaxSimulationResults = () => {
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<TaxSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails>({});
  const {
    toast
  } = useToast();
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
      const results = simulations.filter(sim => {
        const searchLower = searchTerm.toLowerCase();

        // Verificar nos dados do usuário armazenados
        const userEmail = userDetails[sim.user_id || '']?.email?.toLowerCase() || '';
        const userName = userDetails[sim.user_id || '']?.name?.toLowerCase() || '';

        // Verificar nos campos da simulação
        const simulationName = (sim.nome || '').toLowerCase();
        const simulationEmail = (sim.email || '').toLowerCase();
        const simulationPhone = (sim.telefone || '').toLowerCase();
        return simulationName.includes(searchLower) || simulationEmail.includes(searchLower) || simulationPhone.includes(searchLower) || userEmail.includes(searchLower) || userName.includes(searchLower) || sim.tipo_simulacao.includes(searchLower);
      });
      setFilteredSimulations(results);
    }
  }, [searchTerm, simulations, userDetails]);
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
    return <LoadingState />;
  }
  return <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Simulações de Imposto de Renda
          </h1>
          <p className="text-gray-600 dark:text-white/70">
            Visualize todas as simulações feitas pelos usuários
          </p>
        </div>
        
        <SearchFilter searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>
      
      {filteredSimulations.length === 0 ? <EmptyState searchTerm={searchTerm} /> : <div className="space-y-8">
          <SimulationsSummary simulations={filteredSimulations} />
          <SimulationsTable simulations={filteredSimulations} getUserName={getUserName} getUserEmail={getUserEmail} />
        </div>}
    </div>;
};
export default TaxSimulationResults;