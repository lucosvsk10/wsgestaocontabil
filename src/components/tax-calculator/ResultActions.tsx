
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Save, Copy, MessageCircle } from "lucide-react";
import ContactForm from "./ContactForm";
import { UseFormReturn } from "react-hook-form";
import { TaxFormValues } from "@/types/tax-simulations";
import { useToast } from "@/hooks/use-toast";

interface ResultActionsProps {
  isLoggedIn: boolean;
  form: UseFormReturn<TaxFormValues, any, undefined>;
  onSaveSimulation: () => void;
  onContactWhatsApp: () => void;
  simulationResult?: any;
  simulationType?: string;
}

const ResultActions: React.FC<ResultActionsProps> = ({
  isLoggedIn,
  form,
  onSaveSimulation,
  onContactWhatsApp,
  simulationResult,
  simulationType = "irpf"
}) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    // Salvar a simulação antes de imprimir
    onSaveSimulation();
    
    // Criar conteúdo para impressão
    const printContent = `
      <html>
        <head>
          <title>Simulação ${simulationType.toUpperCase()} - WS Gestão Contábil</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #efc349; font-size: 24px; font-weight: bold; }
            .result-item { margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee; }
            .total { font-size: 18px; font-weight: bold; color: #020817; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WS GESTÃO CONTÁBIL</div>
            <h2>Simulação ${simulationType.toUpperCase()}</h2>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div class="content">
            ${simulationResult ? Object.entries(simulationResult).map(([key, value]) => `
              <div class="result-item">
                <strong>${key}:</strong> ${typeof value === 'number' ? 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : 
                  value}
              </div>
            `).join('') : ''}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
    
    toast({
      title: "Impressão iniciada",
      description: "A simulação foi salva e está sendo impressa.",
    });
  };

  const handleSave = () => {
    onSaveSimulation();
    toast({
      title: "Simulação salva",
      description: "Sua simulação foi salva com sucesso no seu perfil.",
    });
  };

  const handleCopy = () => {
    if (!simulationResult) {
      toast({
        title: "Erro",
        description: "Nenhum resultado para copiar.",
        variant: "destructive"
      });
      return;
    }

    const resultText = Object.entries(simulationResult)
      .map(([key, value]) => {
        const formattedValue = typeof value === 'number' ? 
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : 
          value;
        return `${key}: ${formattedValue}`;
      })
      .join('\n');

    const fullText = `Simulação ${simulationType.toUpperCase()} - WS Gestão Contábil\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n${resultText}`;

    navigator.clipboard.writeText(fullText).then(() => {
      toast({
        title: "Copiado!",
        description: "O resultado foi copiado para a área de transferência.",
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o resultado.",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Ações principais */}
      <div className="flex flex-col md:flex-row justify-center gap-3">
        <Button 
          onClick={handlePrint}
          variant="outline"
          className="min-w-[140px] flex items-center gap-2"
        >
          <Printer size={16} />
          Imprimir
        </Button>
        
        <Button 
          onClick={handleSave}
          className="min-w-[140px] flex items-center gap-2"
        >
          <Save size={16} />
          Salvar
        </Button>
        
        <Button 
          onClick={handleCopy}
          variant="outline"
          className="min-w-[140px] flex items-center gap-2"
        >
          <Copy size={16} />
          Copiar
        </Button>
      </div>

      {/* Ações secundárias para usuários não logados */}
      {!isLoggedIn && (
        <div className="border-t pt-4">
          {!showContactForm ? (
            <div className="space-y-3 w-full max-w-md mx-auto">
              <Button 
                onClick={() => setShowContactForm(true)} 
                className="w-full"
              >
                Enviar para análise personalizada
              </Button>
              <Button 
                onClick={onContactWhatsApp} 
                variant="outline" 
                className="w-full flex items-center gap-2"
              >
                <MessageCircle size={16} />
                Fale com a WS
              </Button>
            </div>
          ) : (
            <ContactForm form={form} onSave={onSaveSimulation} />
          )}
        </div>
      )}
    </div>
  );
};

export default ResultActions;
