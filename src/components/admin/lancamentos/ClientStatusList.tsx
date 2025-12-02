import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Clock, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClientStatus {
  id: string;
  name: string;
  email: string;
  documentsCount: number;
  pendingCount: number;
  closedMonths: number;
  hasError: boolean;
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

      // For each user, get their document status
      const clientStatuses = await Promise.all(
        (users || []).map(async (user) => {
          // Get documents count for current month
          const { count: docsCount } = await supabase
            .from('documentos_conciliacao')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('competencia', currentCompetencia);

          // Get pending documents
          const { count: pendingCount } = await supabase
            .from('documentos_conciliacao')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('competencia', currentCompetencia)
            .in('status_processamento', ['pendente', 'processando']);

          // Get error documents
          const { count: errorCount } = await supabase
            .from('documentos_conciliacao')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('competencia', currentCompetencia)
            .eq('status_processamento', 'erro');

          // Get closed months count
          const { count: closedCount } = await supabase
            .from('fechamentos_exportados')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          return {
            id: user.id,
            name: user.name || 'Sem nome',
            email: user.email || '',
            documentsCount: docsCount || 0,
            pendingCount: pendingCount || 0,
            closedMonths: closedCount || 0,
            hasError: (errorCount || 0) > 0
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

  const getStatusBadge = (client: ClientStatus) => {
    if (client.hasError) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    }
    if (client.pendingCount > 0) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Processando
        </Badge>
      );
    }
    if (client.documentsCount > 0) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
          <FileText className="h-3 w-3 mr-1" />
          {client.documentsCount} docs
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sem docs
      </Badge>
    );
  };

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
              {getStatusBadge(client)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {client.email}
            </p>
            {client.closedMonths > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">
                  {client.closedMonths} mês(es) fechado(s)
                </span>
              </div>
            )}
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
