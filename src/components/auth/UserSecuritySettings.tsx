
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

export const UserSecuritySettings = () => {
  const [showMFASetup, setShowMFASetup] = useState(false);
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
              disabled
              className="w-full"
            >
              Verificação de vazamentos indisponível
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">Esta tela não consegue consultar a sua senha. Não apresentamos uma confirmação de segurança sem uma verificação real.</p>
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
