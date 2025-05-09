
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserFormData } from "../CreateUser";
import { Loader2 } from "lucide-react";

interface UserCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  isCreating: boolean;
}

// Schema to validate user creation form
const userSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type UserCreationFormData = z.infer<typeof userSchema>;

export const UserCreationDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isCreating
}: UserCreationDialogProps) => {
  const form = useForm<UserCreationFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    }
  });

  const handleSubmit = (data: UserCreationFormData) => {
    // Convert to UserFormData format (without confirmPassword)
    onSubmit({
      name: data.name,
      email: data.email,
      password: data.password,
      isAdmin: false
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-navy-dark border border-gold/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold">Criar Novo Usuário</DialogTitle>
          <DialogDescription className="text-navy/70 dark:text-gold/70">
            Preencha os campos abaixo para criar um novo usuário.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-navy dark:text-gold">Nome Completo</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="João da Silva"
                      className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-navy dark:text-gold">Email</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      placeholder="joao@exemplo.com"
                      className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-navy dark:text-gold">Senha</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password"
                      placeholder="******"
                      className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-navy dark:text-gold">Confirme a Senha</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password"
                      placeholder="******"
                      className="bg-white dark:bg-navy-light/50 border-gray-300 dark:border-gold/20 text-navy dark:text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-gold/20 text-navy dark:text-gold"
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-navy hover:bg-navy-light text-white dark:bg-gold dark:hover:bg-gold-light dark:text-navy"
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 
                    Criando...
                  </span>
                ) : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
