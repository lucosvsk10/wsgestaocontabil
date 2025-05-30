
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEvent: (eventData: {
    title: string;
    description: string;
    date: string;
    category: string;
    status: string;
  }) => void;
  isCreating: boolean;
}

export const CreateEventDialog = ({
  open,
  onOpenChange,
  onCreateEvent,
  isCreating
}: CreateEventDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('upcoming');

  const handleSubmit = () => {
    if (!title || !date || !category) return;

    onCreateEvent({
      title,
      description,
      date: date.toISOString().split('T')[0],
      category,
      status
    });

    // Reset form
    setTitle('');
    setDescription('');
    setDate(undefined);
    setCategory('');
    setStatus('upcoming');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-extralight text-gray-900 dark:text-white">
            Criar Novo Evento Fiscal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Título do Evento *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Vencimento IRPJ"
              className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição detalhada do evento..."
              className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Data do Evento *
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria *
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IRPJ">IRPJ</SelectItem>
                <SelectItem value="IRPF">IRPF</SelectItem>
                <SelectItem value="ICMS">ICMS</SelectItem>
                <SelectItem value="ISS">ISS</SelectItem>
                <SelectItem value="PIS/COFINS">PIS/COFINS</SelectItem>
                <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Próximo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-200 dark:border-[#efc349]/30"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title || !date || !category || isCreating}
            className="bg-[#efc349] hover:bg-[#efc349]/80 text-black"
          >
            {isCreating ? 'Criando...' : 'Criar Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
