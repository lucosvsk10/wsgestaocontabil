
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle, Trash2 } from "lucide-react";
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
  expiration_date: z.date().optional(),
  questions: z.array(z.object({
    question_text: z.string().min(3, { message: "A pergunta deve ter pelo menos 3 caracteres" }),
    min_value: z.coerce.number().int().min(0, { message: "Valor mínimo deve ser pelo menos 0" }),
    max_value: z.coerce.number().int().min(1, { message: "Valor máximo deve ser pelo menos 1" })
      .refine(val => val > 0, { message: "Valor máximo deve ser maior que 0" })
  })).min(1, { message: "Adicione pelo menos uma pergunta" })
    .refine(questions => {
      return questions.every(q => q.max_value > q.min_value);
    }, { message: "O valor máximo deve ser maior que o valor mínimo para todas as perguntas" }),
});

interface CreateNumericalPollFormProps {
  onPollCreated: () => void;
}

export const CreateNumericalPollForm = ({ onPollCreated }: CreateNumericalPollFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      questions: [
        { question_text: "", min_value: 0, max_value: 10 }
      ]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions"
  });

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
          allow_comments: false, // Não há comentários em enquetes numéricas
          expires_at: values.expiration_date ? values.expiration_date.toISOString() : null,
          created_by: user.id,
          poll_type: 'numerical'
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Insert numerical questions
      const questionsToInsert = values.questions.map(question => ({
        poll_id: pollData.id,
        question_text: question.question_text,
        min_value: question.min_value,
        max_value: question.max_value
      }));

      const { error: questionsError } = await supabase
        .from("numerical_questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Sucesso!",
        description: "Formulário numeral criado com sucesso.",
      });

      form.reset({
        title: "",
        description: "",
        is_public: false,
        questions: [
          { question_text: "", min_value: 0, max_value: 10 }
        ]
      });
      onPollCreated();

    } catch (error) {
      console.error("Erro ao criar formulário numeral:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o formulário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuestion = () => {
    append({ question_text: "", min_value: 0, max_value: 10 });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Formulário</FormLabel>
              <FormControl>
                <Input placeholder="Digite o título do formulário" {...field} />
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
                  placeholder="Digite uma descrição para o formulário" 
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
                    Se ativado, todos poderão ver e responder ao formulário
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
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <FormLabel>Perguntas</FormLabel>
            <Button 
              type="button" 
              onClick={addQuestion} 
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <PlusCircle size={16} />
              <span>Adicionar Pergunta</span>
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 p-4 border rounded-md bg-orange-50/30 dark:bg-navy-light/20">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Pergunta {index + 1}</h4>
                {fields.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => remove(index)}
                    className="text-red-500 h-8 w-8 p-0"
                  >
                    <Trash2 size={16} />
                    <span className="sr-only">Remover pergunta</span>
                  </Button>
                )}
              </div>

              <FormField
                control={form.control}
                name={`questions.${index}.question_text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto da pergunta</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a pergunta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`questions.${index}.min_value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`questions.${index}.max_value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor máximo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
          
          {form.formState.errors.questions && typeof form.formState.errors.questions.message === 'string' && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.questions.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Criando Formulário..." : "Criar Formulário"}
        </Button>
      </form>
    </Form>
  );
};
