import { supabase } from '@/lib/supabaseClient';
import { TaxFormInput, TaxResult } from './types';
import { calculateTaxBrackets } from './calculations';

export class TaxService {
  async saveTaxSimulation(userId: string, formData: TaxFormInput, result: TaxResult) {
    try {
      const { data, error } = await supabase.from('tax_simulations').insert({
        user_id: userId,
        nome: formData.nome || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        rendimento_bruto: formData.rendimentosTributaveis,
        rendimentos_isentos: formData.rendimentosIsentos,
        inss: formData.contribuicaoPrevidenciaria,
        educacao: formData.despesasEducacao,
        saude: formData.despesasMedicas,
        dependentes: formData.numeroDependentes,
        outras_deducoes: formData.pensaoAlimenticia + formData.livroCaixa,
        imposto_estimado: result.saldoImposto,
        tipo_simulacao: result.tipoSaldo === 'pagar' ? 'a pagar' : 'restituição',
        data_criacao: new Date().toISOString(),
        observacoes: ''
      }).select().single();

      if (error) {
        console.error('Error saving tax simulation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception saving tax simulation:', error);
      return null;
    }
  }

  async getUserSimulations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .eq('user_id', userId)
        .order('data_criacao', { ascending: false });

      if (error) {
        console.error('Error fetching user simulations:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Exception fetching user simulations:', error);
      return [];
    }
  }

  async getSimulationById(simulationId: string) {
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .eq('id', simulationId)
        .single();

      if (error) {
        console.error('Error fetching simulation by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching simulation by ID:', error);
      return null;
    }
  }

  async deleteSimulation(simulationId: string) {
    try {
      const { error } = await supabase
        .from('tax_simulations')
        .delete()
        .eq('id', simulationId);

      if (error) {
        console.error('Error deleting simulation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting simulation:', error);
      return false;
    }
  }
}

/**
 * Calculates tax results based on form data
 */
export { calculateTaxBrackets as calculateTaxes } from './calculations';
