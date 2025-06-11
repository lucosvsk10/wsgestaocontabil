
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ResultActions from "@/components/calculators/ResultActions";

interface TaxResultData {
  rendimentoBruto: number;
  inss: number;
  dependentes: number;
  educacao: number;
  saude: number;
  outrasDeducoes: number;
  baseCalculo: number;
  impostoDevido: number;
  aliquotaEfetiva: number;
  totalDeducoes: number;
}

interface TaxResultProps {
  resultado: TaxResultData;
  formatCurrency: (value: number) => string;
}

export const TaxResult: React.FC<TaxResultProps> = ({ resultado, formatCurrency }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.5 }}
    >
      <Card className="print:bg-white print:border-gray-300">
        <CardHeader>
          <CardTitle className="font-extralight print:text-foreground">
            Resultado do Cálculo
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
              <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Resumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Rendimento Bruto:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.rendimentoBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Total de Deduções:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.totalDeducoes)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                  <span className="text-muted-foreground print:text-gray-600">Base de Cálculo:</span>
                  <span className="text-foreground font-medium print:text-black">{formatCurrency(resultado.baseCalculo)}</span>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
              <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Imposto</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Alíquota Efetiva:</span>
                  <Badge className="bg-primary text-primary-foreground print:bg-blue-100 print:text-blue-800 print:border print:border-blue-300">
                    {resultado.aliquotaEfetiva}%
                  </Badge>
                </div>
                <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                  <span className="text-muted-foreground print:text-gray-600">Imposto Devido:</span>
                  <span className="text-2xl font-bold text-gold print:text-foreground">
                    {formatCurrency(resultado.impostoDevido)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
              <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Deduções Utilizadas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">INSS:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.inss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Dependentes ({resultado.dependentes}):</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.dependentes * 2275.08)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Educação:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.educacao)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Saúde:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.saude)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Outras:</span>
                  <span className="text-foreground print:text-black">{formatCurrency(resultado.outrasDeducoes)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="print:hidden">
        <ResultActions resultData={resultado} calculatorType="irpf" />
      </div>
    </motion.div>
  );
};
