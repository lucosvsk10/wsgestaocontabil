
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DocumentCategory } from "@/types/admin";

export const useDocumentCategories = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setCategories(data as DocumentCategory[] || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addCategory = useCallback(async (name: string, color?: string) => {
    try {
      // Validação para prevenir categorias duplicadas
      const isDuplicate = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Uma categoria com este nome já existe"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('document_categories')
        .insert({ name, color })
        .select()
        .single();
      
      if (error) throw error;
      
      setCategories(prev => [...prev, data as DocumentCategory]);
      toast({
        title: "Categoria adicionada",
        description: `A categoria "${name}" foi adicionada com sucesso.`
      });
      return true;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar categoria",
        description: error.message
      });
      return false;
    }
  }, [categories, toast]);

  const updateCategory = useCallback(async (id: string, name: string, color?: string) => {
    try {
      // Validação para prevenir categorias duplicadas (excluindo a categoria atual)
      const isDuplicate = categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Uma categoria com este nome já existe"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('document_categories')
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setCategories(prev => prev.map(c => c.id === id ? data as DocumentCategory : c));
      toast({
        title: "Categoria atualizada",
        description: `A categoria foi atualizada com sucesso.`
      });
      return true;
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar categoria",
        description: error.message
      });
      return false;
    }
  }, [categories, toast]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      // Verificar se há documentos usando esta categoria
      const { count, error: countError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('category', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: `Esta categoria está sendo utilizada em ${count} documento(s).`
        });
        return false;
      }

      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCategories(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso."
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir categoria",
        description: error.message
      });
      return false;
    }
  }, [toast]);

  // Carregar categorias ao montar o componente
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Configurar escuta de tempo real para mudanças nas categorias
  useEffect(() => {
    const channel = supabase
      .channel('document_categories_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_categories' },
        () => {
          fetchCategories();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
};
