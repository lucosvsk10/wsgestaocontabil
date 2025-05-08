
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle, Trash2, GripVertical, ArrowUp, ArrowDown, Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  questions: z.array(z.object({
    question_text: z.string().min(3, { message: "A pergunta deve ter pelo menos 3 caracteres" }),
    question_type: z.enum(['short_text', 'paragraph', 'multiple_choice', 'checkbox', 'scale']),
    required: z.boolean().default(true),
    options: z.array(z.string()).optional(),
    scale_min: z.coerce.number().optional(),
    scale_max: z.coerce.number().optional(),
  })).min(1, { message: "Adicione pelo menos uma pergunta" }),
});

interface CreateFormPollFormProps {
  onPollCreated: () => void;
}

export const CreateFormPollForm = ({ onPollCreated }: CreateFormPollFormProps) => {
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
      questions: [
        { 
          question_text: "", 
          question_type: 'short_text', 
          required: true,
          options: []
        }
      ]
    },
  });

  const { fields, append, remove, swap, update } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const watchQuestions = form.watch("questions");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "É necessário estar logado para criar um formulário.",
        variant: "destructive",
      });
      return;
    }

    // Validate options for multiple choice and checkbox
    for (let i = 0; i < values.questions.length; i++) {
      const q = values.questions[i];
      if ((q.question_type === 'multiple_choice' || q.question_type === 'checkbox') && 
          (!q.options || q.options.length < 2)) {
        toast({
          title: "Erro de validação",
          description: `A pergunta ${i + 1} precisa ter pelo menos 2 opções.`,
          variant: "destructive",
        });
        return;
      }
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
          poll_type: 'form'
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Insert form questions
      const questionsToInsert = values.questions.map((question, index) => {
        const options = question.question_type === 'multiple_choice' || question.question_type === 'checkbox'
          ? { options: question.options }
          : question.question_type === 'scale'
          ? { min: question.scale_min || 1, max: question.scale_max || 5 }
          : null;

        return {
          poll_id: pollData.id,
          question_text: question.question_text,
          question_type: question.question_type,
          required: question.required,
          options: options,
          order_position: index
        };
      });

      const { error: questionsError } = await supabase
        .from("form_questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Sucesso!",
        description: "Formulário criado com sucesso.",
      });

      form.reset({
        title: "",
        description: "",
        is_public: false,
        allow_comments: false,
        questions: [
          { 
            question_text: "", 
            question_type: 'short_text', 
            required: true,
            options: []
          }
        ]
      });
      onPollCreated();

    } catch (error) {
      console.error("Erro ao criar formulário:", error);
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
    append({ 
      question_text: "", 
      question_type: 'short_text', 
      required: true,
      options: []
    });
  };

  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      swap(index, index - 1);
    }
  };

  const moveQuestionDown = (index: number) => {
    if (index < fields.length - 1) {
      swap(index, index + 1);
    }
  };

  const handleAddOption = (index: number) => {
    if (!newOption.trim()) return;
    
    const currentOptions = form.getValues(`questions.${index}.options`) || [];
    if (currentOptions.includes(newOption)) {
      toast({
        title: "Erro",
        description: "Esta opção já existe na lista.",
        variant: "destructive",
      });
      return;
    }
    
    const updated = [...currentOptions, newOption];
    form.setValue(`questions.${index}.options`, updated);
    setNewOption("");
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    const updatedOptions = [...currentOptions];
    updatedOptions.splice(optionIndex, 1);
    form.setValue(`questions.${questionIndex}.options`, updatedOptions);
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
                  <FormLabel className="text-base">Formulário Público</FormLabel>
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
            name="allow_comments"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Permitir Comentários</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Adicionar campo para comentários ao final do formulário
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
            <div key={field.id} className="space-y-4 p-4 border rounded-md bg-orange-50/30 dark:bg-navy-light/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GripVertical className="text-muted-foreground" size={16} />
                  <h4 className="font-medium">Pergunta {index + 1}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => moveQuestionUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp size={16} />
                    <span className="sr-only">Mover para cima</span>
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => moveQuestionDown(index)}
                    disabled={index === fields.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown size={16} />
                    <span className="sr-only">Mover para baixo</span>
                  </Button>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name={`questions.${index}.question_type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de pergunta</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(value: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'scale') => {
                          field.onChange(value);
                          // Reset options when changing type
                          if (value === 'multiple_choice' || value === 'checkbox') {
                            form.setValue(`questions.${index}.options`, []);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="short_text">Texto curto</SelectItem>
                          <SelectItem value="paragraph">Parágrafo</SelectItem>
                          <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="scale">Escala</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`questions.${index}.required`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Resposta obrigatória</FormLabel>
                  </FormItem>
                )}
              />

              {watchQuestions[index]?.question_type === 'multiple_choice' || watchQuestions[index]?.question_type === 'checkbox' ? (
                <div className="space-y-3">
                  <FormLabel>Opções</FormLabel>
                  <div className="flex space-x-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Adicionar opção"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={() => handleAddOption(index)} 
                      variant="outline"
                    >
                      <Plus size={16} />
                      <span className="sr-only">Adicionar opção</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {watchQuestions[index]?.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center justify-between bg-orange-50 dark:bg-navy-light/20 p-2 rounded-md">
                        <span>{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index, optionIndex)}
                          className="h-8 w-8 p-0"
                        >
                          <X size={16} className="text-red-500" />
                          <span className="sr-only">Remover opção</span>
                        </Button>
                      </div>
                    ))}
                    
                    {watchQuestions[index]?.options?.length === 0 && (
                      <p className="text-sm text-muted-foreground">Adicione pelo menos 2 opções</p>
                    )}
                  </div>
                </div>
              ) : watchQuestions[index]?.question_type === 'scale' ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`questions.${index}.scale_min`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} defaultValue={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`questions.${index}.scale_max`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor máximo</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} defaultValue={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
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
