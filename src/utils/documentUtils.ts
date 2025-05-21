
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Document } from "@/types/admin";

// Função para formatar a data
export const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Data desconhecida';
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
};

// Função para formatar o tamanho do arquivo
export const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Tamanho desconhecido';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

// Verificar se o documento está expirado
export const isDocumentExpired = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  const expirationDate = new Date(expiresAt);
  return expirationDate < new Date();
};

// Calcular dias restantes até a expiração
export const daysUntilExpiration = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const expirationDate = new Date(expiresAt);
  const today = new Date();
  const diffTime = expirationDate.getTime() - today.getTime();
  if (diffTime <= 0) return 'Expirado';
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} dias`;
};

// Agrupar documentos por categoria
export const getDocumentsByCategory = (allDocuments: Document[], categories: string[]) => {
  const groupedDocuments: Record<string, Document[]> = {};
  
  categories.forEach(category => {
    // Inicializa a categoria com array vazio
    groupedDocuments[category] = [];
    
    // Filtra documentos para esta categoria
    allDocuments.forEach(doc => {
      const docCategory = doc.category.split('/')[0]; // Extrair categoria principal antes da '/'
      
      if (docCategory === category) {
        groupedDocuments[category].push(doc);
      }
    });
  });
  
  return groupedDocuments;
};
