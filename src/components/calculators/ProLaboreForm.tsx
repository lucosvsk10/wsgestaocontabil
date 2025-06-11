
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign } from "lucide-react";

interface ProLaboreFormProps {
  valorBruto: string;
  setValorBruto: (value: string) => void;
  loading: boolean;
  onCalculate: () => void;
  onReset: () => void;
}

export const ProLaboreForm: React.FC<ProLaboreFormProps> = ({
  valorBruto,
  setValorBruto,
  loading,
  onCalculate,
  onReset
}) => {
  return (
    <Card className="print:bg-white print:border-gray-300">
      <CardHeader>
        <CardTitle className="font-extralight flex items-center print:text-foreground">
          <Calculator className="w-6 h-6 mr-2" />
          Dados para Simulação
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="valorBruto" className="font-extralight flex items-center print:text-black">
            <DollarSign className="w-4 h-4 mr-1" />
            Valor Bruto do Pró-labore (R$)
          </Label>
          <Input 
            id="valorBruto" 
            type="number" 
            placeholder="5000.00" 
            value={valorBruto} 
            onChange={e => setValorBruto(e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
          <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
            Valor mínimo: R$ 1.412,00 (salário mínimo)
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
          <h3 className="text-foreground font-medium mb-2 print:text-black">Informações Importantes:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 font-extralight print:text-gray-600">
            <li>• INSS: 11% limitado ao teto de R$ 7.786,02</li>
            <li>• IRRF: Tabela progressiva mensal</li>
            <li>• Valor mínimo: 1 salário mínimo</li>
            <li>• Isento de FGTS</li>
          </ul>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button 
            onClick={onCalculate} 
            disabled={loading || !valorBruto || parseFloat(valorBruto) < 1412} 
            className="flex-1 bg-gold hover:bg-gold-dark text-background font-extralight"
          >
            {loading ? "Calculando..." : "Simular Pró-labore"}
          </Button>
          
          <Button onClick={onReset} variant="outline" className="hover:bg-muted">
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
