
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Data desconhecida';
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
};
