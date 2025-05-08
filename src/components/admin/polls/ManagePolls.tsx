
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Poll } from "@/types/polls";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Trash, FileBarChart, Edit } from "lucide-react";
import { EditPollDialog } from "./EditPollDialog";
import { Badge } from "@/components/ui/badge";

interface ManagePollsProps {
  refreshTrigger: number;
  onViewResults: (poll: Poll) => void;
  onPollDeleted: () => void;
}

export const ManagePolls = ({ refreshTrigger, onViewResults, onPollDeleted }: ManagePollsProps) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollToEdit, setPollToEdit] = useState<Poll | null>(null);
  const [pollToDelete, setPollToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error) {
      console.error("Error fetching polls:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar as enquetes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [refreshTrigger]);

  const handleDeletePoll = async () => {
    if (!pollToDelete) return;
    
    try {
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollToDelete);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Enquete excluída com sucesso",
      });
      
      fetchPolls();
      onPollDeleted();
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a enquete",
        variant: "destructive",
      });
    } finally {
      setPollToDelete(null);
    }
  };

  const getPollStatus = (poll: Poll) => {
    const now = new Date();
    const expiresAt = poll.expires_at ? new Date(poll.expires_at) : null;
    
    if (!expiresAt) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Ativa</Badge>;
    } else if (expiresAt > now) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Ativa</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Expirada</Badge>;
    }
  };

  if (loading) {
    return <p className="text-center py-8">Carregando enquetes...</p>;
  }

  return (
    <>
      {polls.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg mb-4">Nenhuma enquete encontrada</p>
          <p className="text-sm text-muted-foreground">
            Crie uma nova enquete na aba "Criar nova enquete"
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Visibilidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polls.map((poll) => (
                <TableRow key={poll.id}>
                  <TableCell className="font-medium">{poll.title}</TableCell>
                  <TableCell>
                    {poll.is_public ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Pública
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                        Restrita
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getPollStatus(poll)}</TableCell>
                  <TableCell>{format(new Date(poll.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    {poll.expires_at 
                      ? format(new Date(poll.expires_at), "dd/MM/yyyy")
                      : "Sem expiração"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onViewResults(poll)}
                    >
                      <FileBarChart size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setPollToEdit(poll)}
                    >
                      <Edit size={18} />
                    </Button>
                    <AlertDialog open={pollToDelete === poll.id} onOpenChange={(open) => !open && setPollToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setPollToDelete(poll.id)}
                        >
                          <Trash size={18} className="text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Enquete</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta enquete? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeletePoll}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {pollToEdit && (
        <EditPollDialog 
          poll={pollToEdit} 
          open={!!pollToEdit} 
          onOpenChange={(open) => !open && setPollToEdit(null)} 
          onPollUpdated={() => {
            fetchPolls();
            setPollToEdit(null);
          }}
        />
      )}
    </>
  );
};
