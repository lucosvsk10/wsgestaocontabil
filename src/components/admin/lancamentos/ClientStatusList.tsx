import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, CheckCircle, ClipboardList } from "lucide-react";
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
      const {
        data: users,
        error: usersError
      } = await supabase.from('users').select('id, name, email').eq('role', 'client');
      if (usersError) throw usersError;
      const now = new Date();
      const currentCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const clientStatuses = await Promise.all((users || []).map(async user => {
        const {
          count: alignedCount
        } = await supabase.from('lancamentos_alinhados').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id).eq('competencia', currentCompetencia);
        const {
          count: closedCount
        } = await supabase.from('fechamentos_exportados').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id);
        const {
          count: planoCount
        } = await supabase.from('planos_contas').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id);
        return {
          id: user.id,
          name: user.name || 'Sem nome',
          email: user.email || '',
          alignedCount: alignedCount || 0,
          closedMonths: closedCount || 0,
          hasPlanoContas: (planoCount || 0) > 0
        };
      }));
      setClients(clientStatuses);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const filteredClients = clients.filter(client => client.name.toLowerCase().includes(search.toLowerCase()) || client.email.toLowerCase().includes(search.toLowerCase()));
  return <div className="bg-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-transparent">
        <div className="flex items-center gap-2 mb-3">
          
          <h2 className="font-semibold text-foreground">Clientes</h2>
          <Badge variant="secondary" className="ml-auto text-xs">
            {clients.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
        </div>
      </div>

      {/* Client List */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {isLoading ? <div className="p-8 text-center">
            <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
          </div> : filteredClients.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum cliente encontrado
          </div> : <div className="divide-y divide-border/30">
            {filteredClients.map((client, index) => <motion.button key={client.id} initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: index * 0.02
        }} onClick={() => onSelectClient(client.id)} className={cn("w-full p-4 text-left transition-all duration-200", selectedClientId === client.id ? "bg-primary/10" : "hover:bg-muted/50")}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-medium text-foreground text-sm truncate flex-1">
                    {client.name}
                  </span>
                  {client.alignedCount > 0 && <Badge variant="secondary" className="text-xs shrink-0">
                      {client.alignedCount}
                    </Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {client.email}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full", client.hasPlanoContas ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive")}>
                    <ClipboardList className="h-3 w-3" />
                    {client.hasPlanoContas ? "Plano OK" : "Sem plano"}
                  </span>
                  {client.closedMonths > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {client.closedMonths} fechado(s)
                    </span>}
                </div>
              </motion.button>)}
          </div>}
      </div>
    </div>;
};