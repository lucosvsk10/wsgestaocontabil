
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { Poll, PollOption } from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { XCircle } from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(5, {
    message: "O título deve ter pelo menos 5 caracteres",
  }),
  description: z.string().optional(),
  is_public: z.boolean(),
  allow_comments: z.boolean(),
  expiration_date: z.date().optional().nullable(),
});

interface EditPollDialogProps {
  poll: Poll;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPollUpdated: () => void;
}

export const EditPollDialog = ({ poll, open, onOpenChange, onPollUpdated }: EditPollDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [newOption, setNewOption] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: poll.title,
      description: poll.description || "",
      is_public: poll.is_public,
      allow_comments: poll.allow_comments,
      expiration_date: poll.expires_at ? new Date(poll.expires_at) : null,
    },
  });

  useEffect(() => {
    const fetchPollOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const { data, error } = await supabase
          .from("poll_options")
          .select("*")
          .eq("poll_id", poll.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setPollOptions(data || []);
      } catch (error) {
        console.error("Error fetching poll options:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as opções da enquete",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOptions(false);
      }
    };

    if (open) {
      fetchPollOptions();
    }
  }, [poll.id, open]);

  const handleAddOption = async () => {
    if (!newOption.trim()) return;
    
    // Check if option already exists
    if (pollOptions.some(option => option.option_text === newOption)) {
      toast({
        title: "Erro",
        description: "Esta opção já existe na lista.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("poll_options")
        .insert({
          poll_id: poll.id,
          option_text: newOption,
        })
        .select()
        .single();

      if (error) throw error;

      setPollOptions([...pollOptions, data]);
      setNewOption("");
      
      toast({
        title: "Sucesso",
        description: "Opção adicionada com sucesso",
      });
    } catch (error) {
      console.error("Error adding option:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a opção",
        variant: "destructive",
      });
    }
  };

  const handleRemoveOption = async (optionId: string) => {
    if (pollOptions.length <= 2) {
      toast({
        title: "Erro",
        description: "A enquete deve ter pelo menos 2 opções",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("poll_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;

      setPollOptions(pollOptions.filter(option => option.id !== optionId));
      
      toast({
        title: "Sucesso",
        description: "Opção removida com sucesso",
      });
    } catch (error) {
      console.error("Error removing option:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a opção",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("polls")
        .update({
          title: values.title,
          description: values.description || null,
          is_public: values.is_public,
          allow_comments: values.allow_comments,
          expires_at: values.expiration_date ? values.expiration_date.toISOString() : null,
        })
        .eq("id", poll.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Enquete atualizada com sucesso.",
      });

      onPollUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar enquete:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar a enquete.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Enquete</DialogTitle>
        </DialogHeader>

        {isLoadingOptions ? (
          <div className="py-6 text-center">Carregando...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Enquete</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o título da enquete" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Digite uma descrição para a enquete" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enquete Pública</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Se ativado, todos poderão ver e responder à enquete
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_comments"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Permitir Comentários</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Se ativado, os usuários poderão adicionar comentários
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Expiração (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Sem data de expiração</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-2 flex justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => field.onChange(null)}
                          >
                            Remover Data
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() && date.toDateString() !== new Date().toDateString()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Opções de Resposta</FormLabel>
                <div className="flex space-x-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Adicionar opção"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddOption} 
                    variant="outline"
                  >
                    Adicionar
                  </Button>
                </div>

                {pollOptions.length < 2 && (
                  <p className="text-sm font-medium text-destructive">
                    É necessário ter pelo menos 2 opções
                  </p>
                )}

                <div className="space-y-2">
                  {pollOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between bg-orange-50 dark:bg-navy-light/20 p-2 rounded-md">
                      <span>{option.option_text}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(option.id)}
                      >
                        <XCircle size={18} className="text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || pollOptions.length < 2}>
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
