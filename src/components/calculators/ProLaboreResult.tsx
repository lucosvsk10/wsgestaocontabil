
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";
import ResultActions from "./ResultActions";
import { ProLaboreResult as ProLaboreResultType } from "./hooks/useProLaboreCalculation";

interface ProLaboreResultProps {
  resultado: ProLaboreResultType;
  formatCurrency: (value: number) => string;
}

export const ProLaboreResult: React.FC<ProLaboreResultProps> = ({
  resultado,
  formatCurrency
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="print:bg-white print:border-gray-300"
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-extralight print:text-foreground">
            Resultado da Simulação
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Resumo Principal */}
          <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
            <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Resumo</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center print:text-gray-600">
                  <Plus className="w-4 h-4 mr-1 text-green-500" />
                  Valor Bruto:
                </span>
                <span className="text-foreground font-medium text-lg print:text-black">
                  {formatCurrency(resultado.valorBruto)}
                </span>
              </div>

              <div className="border-t border-border pt-3 print:border-gray-300">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center print:text-gray-600">
                    <Minus className="w-4 h-4 mr-1 text-red-500" />
                    INSS (11%):
                  </span>
                  <span className="text-red-500 print:text-red-600">
                    -{formatCurrency(resultado.inss)}
                  </span>
                </div>
                
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground flex items-center print:text-gray-600">
                    <Minus className="w-4 h-4 mr-1 text-red-500" />
                    IRRF ({resultado.aliquotaIRRF}%):
                  </span>
                  <span className="text-red-500 print:text-red-600">
                    -{formatCurrency(resultado.irrf)}
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-gold pt-3 print:border-foreground">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium print:text-gray-600">Valor Líquido:</span>
                  <span className="text-2xl font-bold text-gold print:text-foreground">
                    {formatCurrency(resultado.valorLiquido)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalhamento dos Descontos */}
          <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
            <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Detalhamento</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground print:text-gray-600">INSS:</span>
                  <Badge className="bg-primary text-primary-foreground print:bg-blue-100 print:text-blue-800 print:border print:border-blue-300">11%</Badge>
                </div>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  Base: {formatCurrency(Math.min(resultado.valorBruto, resultado.tetoINSS))}
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground print:text-gray-600">IRRF:</span>
                  <Badge className="bg-secondary text-secondary-foreground print:bg-purple-100 print:text-purple-800 print:border print:border-purple-300">
                    {resultado.aliquotaIRRF}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  Base: {formatCurrency(resultado.valorBruto - resultado.inss)}
                </p>
              </div>

              <div className="border-t border-border pt-2 print:border-gray-300">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Total de Descontos:</span>
                  <span className="text-foreground font-medium print:text-black">
                    {formatCurrency(resultado.totalDescontos)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Projeção Anual */}
          <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
            <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Projeção Anual</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-gray-600">Pró-labore Bruto (12 meses):</span>
                <span className="text-foreground print:text-black">
                  {formatCurrency(resultado.valorBruto * 12)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-gray-600">Total INSS (12 meses):</span>
                <span className="text-red-500 print:text-red-600">
                  -{formatCurrency(resultado.inss * 12)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground print:text-gray-600">Total IRRF (12 meses):</span>
                <span className="text-red-500 print:text-red-600">
                  -{formatCurrency(resultado.irrf * 12)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                <span className="text-muted-foreground font-medium print:text-gray-600">Líquido Anual:</span>
                <span className="text-gold font-bold print:text-foreground">
                  {formatCurrency(resultado.valorLiquido * 12)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
            <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Observações</h3>
            <ul className="text-xs text-muted-foreground space-y-1 font-extralight print:text-gray-600">
              <li>• Pró-labore não tem incidência de FGTS</li>
              <li>• Valor mínimo obrigatório: 1 salário mínimo</li>
              <li>• INSS limitado ao teto: R$ {formatCurrency(resultado.tetoINSS)}</li>
              <li>• Cálculo baseado na tabela 2024</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <div className="print:hidden">
        <ResultActions resultData={resultado} calculatorType="prolabore" />
      </div>
    </motion.div>
  );
};
