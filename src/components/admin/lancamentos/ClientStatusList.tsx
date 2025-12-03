import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, CheckCircle, ClipboardList, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClientStatus {
  id: string;
  name: string;
  email: string;
  alignedCount: number;
  closedMonths: number;
  hasPlanoContas: boolean;
}

interface ClientStatusListProps {
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
}

export const ClientStatusList = ({
  selectedClientId,
  onSelectClient
}: ClientStatusListProps) => {
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'client');

      if (usersError) throw usersError;

      // Get current month competencia
      const now = new Date();
      const currentCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // For each user, get their status
      const clientStatuses = await Promise.all(
        (users || []).map(async (user) => {
          // Get aligned lancamentos count for current month from renamed table
          const { count: alignedCount } = await supabase
            .from('lancamentos_alinhados')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('competencia', currentCompetencia);

          // Get closed months count
          const { count: closedCount } = await supabase
            .from('fechamentos_exportados')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Check if has plano de contas
          const { count: planoCount } = await supabase
            .from('planos_contas')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          return {
            id: user.id,
            name: user.name || 'Sem nome',
            email: user.email || '',
            alignedCount: alignedCount || 0,
            closedMonths: closedCount || 0,
            hasPlanoContas: (planoCount || 0) > 0
          };
        })
      );

      setClients(clientStatuses);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Clientes</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {filteredClients.map((client, index) => (
          <motion.button
            key={client.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onSelectClient(client.id)}
            className={cn(
              "w-full p-4 text-left border-b border-border transition-colors",
              selectedClientId === client.id
                ? "bg-primary/10"
                : "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground truncate">
                {client.name}
              </span>
              {client.alignedCount > 0 && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  {client.alignedCount} lançamentos
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {client.email}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {!client.hasPlanoContas ? (
                <div className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Sem plano</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Plano OK</span>
                </div>
              )}
              {client.closedMonths > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {client.closedMonths} mês(es) fechado(s)
                  </span>
                </div>
              )}
            </div>
          </motion.button>
        ))}

        {filteredClients.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </div>
    </div>
  );
};