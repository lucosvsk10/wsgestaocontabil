
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
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
  is_public: z.boolean().default(false),
  allow_comments: z.boolean().default(false),
  expiration_date: z.date().optional(),
  options: z.array(z.string()).min(2, {
    message: "É necessário adicionar pelo menos 2 opções",
  }),
});

interface CreatePollFormProps {
  onPollCreated: () => void;
}

export const CreatePollForm = ({ onPollCreated }: CreatePollFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOption, setNewOption] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      allow_comments: false,
      options: [],
    },
  });

  const options = form.watch("options");

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    if (options.includes(newOption)) {
      toast({
        title: "Erro",
        description: "Esta opção já existe na lista.",
        variant: "destructive",
      });
      return;
    }
    form.setValue("options", [...options, newOption]);
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    form.setValue("options", updatedOptions);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "É necessário estar logado para criar uma enquete.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert the poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          title: values.title,
          description: values.description || null,
          is_public: values.is_public,
          allow_comments: values.allow_comments,
          expires_at: values.expiration_date ? values.expiration_date.toISOString() : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Insert poll options
      const optionsToInsert = values.options.map(option => ({
        poll_id: pollData.id,
        option_text: option,
      }));

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      toast({
        title: "Sucesso!",
        description: "Enquete criada com sucesso.",
      });

      form.reset({
        title: "",
        description: "",
        is_public: false,
        allow_comments: false,
        options: [],
      });
      onPollCreated();

    } catch (error) {
      console.error("Erro ao criar enquete:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a enquete. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                        <span>Selecione uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
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

          {form.formState.errors.options && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.options.message}
            </p>
          )}

          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center justify-between bg-orange-50 dark:bg-navy-light/20 p-2 rounded-md">
                <span>{option}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                >
                  <XCircle size={18} className="text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Criando Enquete..." : "Criar Enquete"}
        </Button>
      </form>
    </Form>
  );
};
