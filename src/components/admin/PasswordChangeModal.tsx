
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserType } from "@/types/admin";

// Schema para alteração de senha
const passwordSchema = z.object({
  password: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres" }),
});

interface PasswordChangeModalProps {
  selectedUserForPasswordChange: UserType | null;
  setSelectedUserForPasswordChange: (user: UserType | null) => void;
  changeUserPassword: (data: z.infer<typeof passwordSchema>) => void;
  isChangingPassword: boolean;
  passwordForm: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PasswordChangeModal = ({
  selectedUserForPasswordChange,
  setSelectedUserForPasswordChange,
  changeUserPassword,
  isChangingPassword,
  passwordForm,
  open,
  onOpenChange
}: PasswordChangeModalProps) => {
  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setSelectedUserForPasswordChange(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Alterar senha de {selectedUserForPasswordChange?.name || selectedUserForPasswordChange?.email}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(changeUserPassword)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Alterando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
