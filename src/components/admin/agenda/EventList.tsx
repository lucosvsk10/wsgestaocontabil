
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FiscalEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: string;
  status: string;
  created_at: string;
}

interface EventListProps {
  events: FiscalEvent[];
  onDeleteEvent: (eventId: string) => void;
  showAll?: boolean;
}

export const EventList = ({ events, onDeleteEvent, showAll = false }: EventListProps) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fiscal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'contabil':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'trabalhista':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'today':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-extralight">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        {showAll ? "Nenhum evento cadastrado" : "Nenhum evento para esta data"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-gray-50 dark:bg-[#1a2332]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-[#020817] dark:text-white">
                    {event.title}
                  </h3>
                  <Badge className={getCategoryColor(event.category)}>
                    {event.category}
                  </Badge>
                  <Badge className={getStatusColor(event.status)}>
                    {event.status === 'upcoming' ? 'Próximo' : 
                     event.status === 'today' ? 'Hoje' : 'Concluído'}
                  </Badge>
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mb-2">
                    {event.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extralight text-[#020817] dark:text-white">
                      Excluir Evento
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-extralight text-gray-600 dark:text-gray-300">
                      Tem certeza que deseja excluir o evento "{event.title}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#e6e6e6] dark:border-[#efc349]/20 text-[#020817] dark:text-white hover:bg-gray-50 dark:hover:bg-[#efc349]/10">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteEvent(event.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
