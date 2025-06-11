
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Users, Heart, GraduationCap, Home } from "lucide-react";

interface TaxFormProps {
  formData: {
    rendimentoBruto: string;
    inss: string;
    dependentes: string;
    educacao: string;
    saude: string;
    outrasDeducoes: string;
    nome: string;
    email: string;
    telefone: string;
  };
  loading: boolean;
  onInputChange: (field: string, value: string) => void;
  onCalculate: () => void;
}

export const TaxForm: React.FC<TaxFormProps> = ({
  formData,
  loading,
  onInputChange,
  onCalculate
}) => {
  return (
    <Card className="print:bg-white print:border-gray-300">
      <CardHeader>
        <CardTitle className="font-extralight flex items-center print:text-foreground text-base">
          <Calculator className="w-6 h-6 mr-2" />
          Dados para Cálculo
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="rendimentoBruto" className="font-extralight flex items-center print:text-black">
            <DollarSign className="w-4 h-4 mr-1" />
            Rendimento Bruto Anual (R$)
          </Label>
          <Input 
            id="rendimentoBruto" 
            type="number" 
            placeholder="100000.00" 
            value={formData.rendimentoBruto} 
            onChange={e => onInputChange("rendimentoBruto", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
        </div>

        <div>
          <Label htmlFor="inss" className="font-extralight flex items-center print:text-black">
            <Home className="w-4 h-4 mr-1" />
            INSS Pago (R$)
          </Label>
          <Input 
            id="inss" 
            type="number" 
            placeholder="7507.49" 
            value={formData.inss} 
            onChange={e => onInputChange("inss", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
        </div>

        <div>
          <Label htmlFor="dependentes" className="font-extralight flex items-center print:text-black">
            <Users className="w-4 h-4 mr-1" />
            Número de Dependentes
          </Label>
          <Input 
            id="dependentes" 
            type="number" 
            placeholder="0" 
            value={formData.dependentes} 
            onChange={e => onInputChange("dependentes", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
        </div>

        <div>
          <Label htmlFor="educacao" className="font-extralight flex items-center print:text-black">
            <GraduationCap className="w-4 h-4 mr-1" />
            Gastos com Educação (R$)
          </Label>
          <Input 
            id="educacao" 
            type="number" 
            placeholder="3561.50" 
            value={formData.educacao} 
            onChange={e => onInputChange("educacao", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
          <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
            Limite: R$ 3.561,50 por dependente
          </p>
        </div>

        <div>
          <Label htmlFor="saude" className="font-extralight flex items-center print:text-black">
            <Heart className="w-4 h-4 mr-1" />
            Gastos com Saúde (R$)
          </Label>
          <Input 
            id="saude" 
            type="number" 
            placeholder="5000.00" 
            value={formData.saude} 
            onChange={e => onInputChange("saude", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
          <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
            Sem limite de valor
          </p>
        </div>

        <div>
          <Label htmlFor="outrasDeducoes" className="font-extralight print:text-black">
            Outras Deduções (R$)
          </Label>
          <Input 
            id="outrasDeducoes" 
            type="number" 
            placeholder="0.00" 
            value={formData.outrasDeducoes} 
            onChange={e => onInputChange("outrasDeducoes", e.target.value)} 
            className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
          />
        </div>

        <div className="print:hidden">
          <Button 
            onClick={onCalculate} 
            disabled={loading || !formData.rendimentoBruto} 
            className="w-full bg-gold hover:bg-gold-dark text-background font-extralight"
          >
            {loading ? "Calculando..." : "Calcular IRPF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
