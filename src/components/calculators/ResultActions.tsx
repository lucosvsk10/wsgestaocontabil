
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResultActionsProps {
  resultData: any;
  calculatorType: string;
}

const ResultActions: React.FC<ResultActionsProps> = ({
  resultData,
  calculatorType
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = () => {
    window.print();
    toast({
      title: "Imprimindo",
      description: "A página está sendo preparada para impressão.",
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Aqui você pode implementar a lógica para salvar no banco de dados
      // Por enquanto, vou simular o salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Simulação Salva",
        description: "A simulação foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar a simulação.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    const resultText = JSON.stringify(resultData, null, 2);
    navigator.clipboard.writeText(resultText);
    
    toast({
      title: "Resultado Copiado",
      description: "Os dados da simulação foram copiados para a área de transferência.",
    });
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8 print:hidden">
      <Button 
        onClick={handlePrint}
        variant="outline"
        className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
      >
        <Printer className="w-4 h-4 mr-2" />
        Imprimir
      </Button>
      
      <Button 
        onClick={handleSave}
        disabled={isSaving}
        className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Salvando..." : "Salvar"}
      </Button>
      
      <Button 
        onClick={handleCopy}
        variant="outline"
        className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copiar
      </Button>
    </div>
  );
};

export default ResultActions;
