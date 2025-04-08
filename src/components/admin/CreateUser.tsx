
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

// Schema para validação de criação de usuário
const userSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  isAdmin: z.boolean().default(false),
  role: z.string().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

interface CreateUserProps {
  createUser: (data: UserFormData) => void;
  isCreatingUser: boolean;
}

export const CreateUser = ({ createUser, isCreatingUser }: CreateUserProps) => {
  // Form para criação de usuário
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      isAdmin: false,
      role: "admin",
    },
  });

  // Watch isAdmin value to control role field visibility and validation
  const isAdmin = form.watch("isAdmin");

  // Toggle role validation based on isAdmin
  useEffect(() => {
    if (isAdmin) {
      // Require role when isAdmin is true
      form.setValue("role", form.getValues("role") || "admin");
    } else {
      // Clear role when isAdmin is false
      form.setValue("role", undefined);
    }
  }, [isAdmin, form]);

  const onSubmit = (data: UserFormData) => {
    createUser(data);
    // Reset form after submission only on success, handled in useUserCreation
    if (!isCreatingUser) {
      form.reset();
    }
  };

  return (
    <Card className="bg-[#393532] border border-gold/20">
      <CardHeader>
        <CardTitle className="text-[#e8cc81] tracking-wider font-bold text-center">CRIAR NOVO USUÁRIO</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#e9aa91]">Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} className="bg-[#46413d] border-gold/20 focus-visible:ring-gold" />
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
                  <FormLabel className="text-[#e9aa91]">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="joao@exemplo.com" {...field} className="bg-[#46413d] border-gold/20 focus-visible:ring-gold" />
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
                  <FormLabel className="text-[#e9aa91]">Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} className="bg-[#46413d] border-gold/20 focus-visible:ring-gold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gold/20 p-4 bg-[#46413d]">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-[#e9aa91]">
                      Administrador
                    </FormLabel>
                    <p className="text-sm text-gold/70">
                      Marque esta opção para conceder ao usuário privilégios de administrador.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            {isAdmin && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#e9aa91]">Função</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#46413d] border-gold/20 focus-visible:ring-gold text-white">
                          <SelectValue placeholder="Selecione a função do administrador" className="text-white" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#46413d] border-gold/20 text-white">
                        <SelectItem value="admin" className="text-white">Admin</SelectItem>
                        <SelectItem value="fiscal" className="text-white">Fiscal</SelectItem>
                        <SelectItem value="contabil" className="text-white">Contábil</SelectItem>
                        <SelectItem value="geral" className="text-white">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-gold hover:bg-gold-light text-navy" 
              disabled={isCreatingUser}
            >
              {isCreatingUser ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </span>
              ) : (
                "Criar Usuário"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
