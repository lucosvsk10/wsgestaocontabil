import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface UserCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; username: string; password: string; isAdmin: false; role: 'client' }) => void;
  isCreating: boolean;
}

const userSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Usuário deve ter pelo menos 3 caracteres" })
    .max(32, { message: "Usuário deve ter no máximo 32 caracteres" })
    .regex(/^[a-z0-9][a-z0-9._-]*$/, { message: "Use apenas letras minúsculas, números, ponto, hífen ou sublinhado" }),
  password: z.string().min(12, { message: "Senha deve ter pelo menos 12 caracteres" }),
  confirmPassword: z.string().min(12, { message: "Confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type UserCreationFormData = z.infer<typeof userSchema>;

export const UserCreationDialog = ({ isOpen, onClose, onSubmit, isCreating }: UserCreationDialogProps) => {
  const form = useForm<UserCreationFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", username: "", password: "", confirmPassword: "" }
  });

  const handleSubmit = (data: UserCreationFormData) => {
    onSubmit({
      name: data.name.trim(),
      username: data.username.trim().toLowerCase(),
      password: data.password,
      isAdmin: false,
      role: 'client'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-navy-dark border border-gold/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold">Criar acesso de cliente</DialogTitle>
          <DialogDescription className="text-navy/70 dark:text-gold/70">
            O cliente entrará com nome de usuário. O e-mail técnico de autenticação fica interno e não é exibido.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel className="text-navy dark:text-gold">Nome do cliente</FormLabel><FormControl><Input {...field} placeholder="Casa do Ordenhador" autoComplete="off" className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem><FormLabel className="text-navy dark:text-gold">Nome de usuário</FormLabel><FormControl><Input {...field} autoCapitalize="none" spellCheck={false} placeholder="casadoordenhador" className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel className="text-navy dark:text-gold">Senha inicial</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" placeholder="Senha inicial" className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem><FormLabel className="text-navy dark:text-gold">Confirmar senha</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" placeholder="Repita a senha" className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Criando...</span> : "Criar acesso"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};