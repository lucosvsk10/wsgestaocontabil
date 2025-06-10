
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'Data inválida';
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

export const isDocumentExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  try {
    return new Date(expiresAt) < new Date();
  } catch (error) {
    console.error('Erro ao verificar expiração:', error);
    return false;
  }
};

export const daysUntilExpiration = (expiresAt: string | null): string | null => {
  if (!expiresAt) return null;
  try {
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    
    if (diffTime <= 0) return 'Expirado';
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Expira hoje';
    if (diffDays <= 7) return `Expira em ${diffDays} dias`;
    if (diffDays <= 30) return `Expira em ${diffDays} dias`;
    
    return `Expira em ${diffDays} dias`;
  } catch (error) {
    console.error('Erro ao calcular dias até expiração:', error);
    return 'Erro no cálculo';
  }
};

export const getDocumentStatusColor = (status: string | null, expiresAt: string | null): string => {
  if (status === 'expired' || isDocumentExpired(expiresAt)) {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-green-600 dark:text-green-400';
};

export const getDocumentStatusText = (status: string | null, expiresAt: string | null): string => {
  if (status === 'expired') {
    return 'Expirado (Sistema)';
  }
  if (isDocumentExpired(expiresAt)) {
    return 'Expirado';
  }
  return 'Ativo';
};
