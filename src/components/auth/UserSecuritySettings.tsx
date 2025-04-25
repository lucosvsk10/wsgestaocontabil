
import { useState } from 'react';
import { MFASetup } from './MFASetup';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const UserSecuritySettings = () => {
  const [showMFASetup, setShowMFASetup] = useState(false);
  const { toast } = useToast();

  const checkPasswordBreach = async () => {
    try {
      const { error } = await supabase.auth.detectPasswordBreach();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Verificação Concluída",
        description: "Sua senha não foi encontrada em vazamentos conhecidos."
      });
    } catch (error) {
      console.error('Error checking password breach:', error);
      toast({
        variant: "destructive",
        title: "Alerta de Segurança",
        description: "Sua senha foi encontrada em vazamentos. Recomendamos alterá-la imediatamente."
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Segurança da Conta</CardTitle>
          <CardDescription>
            Configure opções adicionais de segurança para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              onClick={checkPasswordBreach}
              className="w-full"
            >
              Verificar Vazamento de Senha
            </Button>
          </div>
          
          {!showMFASetup ? (
            <Button 
              onClick={() => setShowMFASetup(true)}
              className="w-full"
            >
              Configurar Autenticação em Dois Fatores
            </Button>
          ) : (
            <MFASetup />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
