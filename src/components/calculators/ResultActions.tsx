
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Copy, Printer, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface ResultActionsProps {
  resultData: any;
  calculatorType: 'irpf' | 'prolabore' | 'inss';
}

const ResultActions = ({ resultData, calculatorType }: ResultActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactData, setContactData] = useState({
    nome: "",
    email: "",
    telefone: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSaveSimulation = async () => {
    if (!user && (!contactData.nome || !contactData.email)) {
      toast({
        title: "Erro",
        description: "Preencha nome e email para salvar a simulação",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let saveData;
      let tableName;

      switch (calculatorType) {
        case 'irpf':
          tableName = 'tax_simulations';
          saveData = {
            user_id: user?.id || null,
            rendimento_bruto: resultData.rendimentoBruto || 0,
            inss: resultData.inss || 0,
            educacao: resultData.educacao || 0,
            saude: resultData.saude || 0,
            dependentes: resultData.dependentes || 0,
            outras_deducoes: resultData.outrasDeducoes || 0,
            imposto_estimado: resultData.impostoDevido || 0,
            tipo_simulacao: 'irpf',
            nome: user ? null : contactData.nome,
            email: user ? null : contactData.email,
            telefone: user ? null : contactData.telefone
          };
          break;

        case 'prolabore':
          tableName = 'prolabore_simulations';
          saveData = {
            user_id: user?.id || null,
            valor_bruto: resultData.valorBruto || 0,
            inss: resultData.inss || 0,
            irrf: resultData.irrf || 0,
            aliquota_irrf: resultData.aliquotaIRRF || 0,
            valor_liquido: resultData.valorLiquido || 0,
            total_descontos: resultData.totalDescontos || 0
          };
          break;

        case 'inss':
          tableName = 'inss_simulations';
          saveData = {
            user_id: user?.id || null,
            categoria: resultData.categoria || '',
            valor_base: resultData.valorBase || 0,
            contribuicao: resultData.contribuicao || 0,
            aliquota: resultData.aliquota || 0,
            tipo_facultativo: resultData.tipoFacultativo || null,
            detalhes: resultData.detalhes || ''
          };
          break;

        default:
          throw new Error('Tipo de calculadora não suportado');
      }

      const { error } = await supabase
        .from(tableName)
        .insert(saveData);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Simulação salva com sucesso!"
      });

      setShowContactForm(false);
      setContactData({ nome: "", email: "", telefone: "" });
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a simulação",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyResults = () => {
    let textToCopy = '';
    
    switch (calculatorType) {
      case 'irpf':
        textToCopy = `
SIMULAÇÃO IRPF 2024
==================
Rendimento Bruto: R$ ${resultData.rendimentoBruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Base de Cálculo: R$ ${resultData.baseCalculo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Imposto Devido: R$ ${resultData.impostoDevido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Alíquota Efetiva: ${resultData.aliquotaEfetiva}%
        `;
        break;
      case 'prolabore':
        textToCopy = `
SIMULAÇÃO PRÓ-LABORE 2024
========================
Valor Bruto: R$ ${resultData.valorBruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
INSS: R$ ${resultData.inss?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
IRRF: R$ ${resultData.irrf?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Valor Líquido: R$ ${resultData.valorLiquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        `;
        break;
      case 'inss':
        textToCopy = `
SIMULAÇÃO INSS 2024
===================
Categoria: ${resultData.categoria}
Valor Base: R$ ${resultData.valorBase?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Contribuição: R$ ${resultData.contribuicao?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Alíquota: ${resultData.aliquota}%
        `;
        break;
    }

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      toast({
        title: "Copiado!",
        description: "Resultado copiado para a área de transferência"
      });
    });
  };

  const handlePrintResults = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-8 space-y-4"
    >
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <Button
          onClick={() => user ? handleSaveSimulation() : setShowContactForm(true)}
          disabled={saving}
          className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] min-w-[140px]"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>

        <Button
          onClick={handleCopyResults}
          variant="outline"
          className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10 min-w-[140px]"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar
        </Button>

        <Button
          onClick={handlePrintResults}
          variant="outline"
          className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10 min-w-[140px]"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Formulário de contato para usuários não logados */}
      {showContactForm && !user && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-[#0b1320] border-[#efc349]/20 max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-[#efc349] font-extralight text-center">
                <Send className="w-5 h-5 inline mr-2" />
                Dados para Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome" className="text-white font-extralight">
                  Nome *
                </Label>
                <Input
                  id="nome"
                  value={contactData.nome}
                  onChange={(e) => setContactData({ ...contactData, nome: e.target.value })}
                  className="bg-[#020817] border-[#efc349]/30 text-white"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-extralight">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                  className="bg-[#020817] border-[#efc349]/30 text-white"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="telefone" className="text-white font-extralight">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  value={contactData.telefone}
                  onChange={(e) => setContactData({ ...contactData, telefone: e.target.value })}
                  className="bg-[#020817] border-[#efc349]/30 text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveSimulation}
                  disabled={saving || !contactData.nome || !contactData.email}
                  className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                >
                  {saving ? "Salvando..." : "Enviar para WS"}
                </Button>
                <Button
                  onClick={() => setShowContactForm(false)}
                  variant="outline"
                  className="border-[#efc349]/30 text-[#efc349]"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ResultActions;
