
import { useState } from 'react';
import { TaxFormValues, TaxResult } from '@/utils/tax/types';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { calculateTaxes } from '@/utils/tax/taxService';
import { useNotifications } from '@/hooks/useNotifications';

export const useTaxCalculator = (onComplete?: (result: TaxResult) => void) => {
  const [activeStep, setActiveStep] = useState(0);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const { createNotification } = useNotifications();

  const saveSimulation = async (data: TaxFormValues, result: TaxResult) => {
    try {
      const simulationData = {
        user_id: data.user?.id || null,
        nome: data.nome || null,
        email: data.email || null,
        telefone: data.telefone || null,
        rendimento_bruto: data.rendimentosTributaveis,
        rendimentos_isentos: data.rendimentosIsentos,
        inss: data.contribuicaoPrevidenciaria,
        educacao: data.despesasEducacao,
        saude: data.despesasMedicas,
        dependentes: data.numeroDependentes,
        outras_deducoes: data.pensaoAlimenticia + data.livroCaixa,
        imposto_estimado: result.saldoImposto,
        tipo_simulacao: result.tipoSaldo === 'pagar' ? 'a pagar' : 'restituição',
        observacoes: ''
      };

      const { error } = await supabase.from('tax_simulations').insert(simulationData);

      if (error) {
        console.error('Erro ao salvar simulação:', error);
        toast({
          title: "Erro ao salvar simulação",
          description: "Não foi possível salvar sua simulação. Por favor, tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      // Criar notificação se o usuário estiver logado
      if (data.user) {
        createNotification(
          `Nova simulação de IRPF: ${result.tipoSaldo === 'pagar' ? 'Imposto a pagar' : 'Restituição'} de ${Math.abs(result.saldoImposto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          'tax'
        );
      }

      toast({
        title: "Simulação salva com sucesso",
        description: "Sua simulação de IRPF foi armazenada e pode ser consultada posteriormente.",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      toast({
        title: "Erro ao salvar simulação",
        description: "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  const calculateAndSaveResult = async (data: TaxFormValues) => {
    // Calculate tax result
    const result = calculateTaxes(data);
    setTaxResult(result);
    
    // Save the simulation
    await saveSimulation(data, result);
    
    setActiveStep(3); // Move to results step
    
    if (onComplete) {
      onComplete(result);
    }

    return result;
  };

  const handleStepAdvance = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  const restartForm = () => {
    setTaxResult(null);
    setActiveStep(0);
    return true;
  };

  return {
    activeStep,
    taxResult,
    handleStepAdvance,
    handlePrevious,
    calculateAndSaveResult,
    restartForm
  };
};
