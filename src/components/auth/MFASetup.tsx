
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const MFASetup = () => {
  const [factorId, setFactorId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const setupMFA = async () => {
    try {
      setIsEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (error) {
        throw error;
      }

      if (data) {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
      }
    } catch (error) {
      console.error('Error setting up MFA:', error);
      toast({
        variant: "destructive",
        title: "Erro ao configurar MFA",
        description: error.message
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyMFA = async () => {
    if (!verifyCode || !factorId) return;

    try {
      setIsVerifying(true);
      const { error } = await supabase.auth.mfa.challenge({ 
        factorId 
      });

      if (error) {
        throw error;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({ 
        factorId, 
        code: verifyCode 
      });

      if (verifyError) {
        throw verifyError;
      }

      toast({
        title: "MFA Ativado",
        description: "Autenticação em dois fatores configurada com sucesso!"
      });
    } catch (error) {
      console.error('Error verifying MFA:', error);
      toast({
        variant: "destructive",
        title: "Erro ao verificar código",
        description: error.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Configurar Autenticação em Dois Fatores</CardTitle>
        <CardDescription>
          Aumente a segurança da sua conta usando um aplicativo autenticador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrCode ? (
          <Button 
            onClick={setupMFA} 
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Configurando..." : "Configurar MFA"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code para MFA" className="max-w-[200px]" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Escaneie o QR code acima com seu aplicativo autenticador
            </p>
            <div className="space-y-2">
              <InputOTP
                maxLength={6}
                value={verifyCode}
                onChange={setVerifyCode}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} />
                    ))}
                  </InputOTPGroup>
                )}
              />
              <Button 
                onClick={verifyMFA} 
                disabled={!verifyCode || isVerifying}
                className="w-full"
              >
                {isVerifying ? "Verificando..." : "Verificar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
