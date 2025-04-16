
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Data desconhecida';
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
};

export const calculateDaysRemaining = (expirationDate: string | null): number | null => {
  if (!expirationDate) return null;
  
  const expDate = new Date(expirationDate);
  const today = new Date();
  
  // Reset the time part for accurate day calculation
  expDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const timeDiff = expDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

export const formatExpirationStatus = (expirationDate: string | null): string => {
  if (!expirationDate) return 'Sem validade';
  
  const daysRemaining = calculateDaysRemaining(expirationDate);
  
  if (daysRemaining === null) return 'Data inválida';
  
  if (daysRemaining < 0) return 'Expirado';
  if (daysRemaining === 0) return 'Expira hoje';
  if (daysRemaining === 1) return 'Expira amanhã';
  
  return `Expira em ${daysRemaining} dias`;
};

export const isDocumentExpired = (expirationDate: string | null): boolean => {
  if (!expirationDate) return false;
  
  const daysRemaining = calculateDaysRemaining(expirationDate);
  return daysRemaining !== null && daysRemaining < 0;
};
