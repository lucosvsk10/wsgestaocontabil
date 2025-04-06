
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

export const useDocumentManagement = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Documentações");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);
  
  // Carregar documentos do usuário selecionado
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
    } else {
      setDocuments([]);
    }
  }, [selectedUserId]);

  // Função para buscar documentos de um usuário específico
  const fetchUserDocuments = async (userId: string) => {
    setIsLoadingDocuments(true);
    try {
      const { data, error } = await supabase.from('documents').select('*').eq('user_id', userId).order('uploaded_at', {
        ascending: false
      });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Função para lidar com o upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (!documentName) {
        setDocumentName(e.target.files[0].name.split('.')[0]);
      }
    }
  };

  // Função para enviar documento
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nenhum usuário selecionado."
      });
      return;
    }
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nenhum arquivo selecionado."
      });
      return;
    }
    if (!documentName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nome do documento é obrigatório."
      });
      return;
    }
    if (!documentCategory) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Categoria do documento é obrigatória."
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // Generate a unique storage key
      const storageKey = `${selectedUserId}/${uuidv4()}`;
      const originalFilename = selectedFile.name;
      
      // 1. Upload do arquivo para o Storage
      const { data: fileData, error: uploadError } = await supabase.storage.from('documents').upload(storageKey, selectedFile);
      
      if (uploadError) throw uploadError;

      // 2. Obter URL pública do arquivo
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageKey);

      // Determine expiration date based on user selection
      let expires_at = null;
      if (!noExpiration && expirationDate) {
        expires_at = expirationDate.toISOString();
      }

      // 3. Salvar informações do documento no banco de dados
      const { data, error: dbError } = await supabase.from('documents').insert({
        user_id: selectedUserId,
        name: documentName,
        category: documentCategory,
        file_url: urlData.publicUrl,
        original_filename: originalFilename,
        storage_key: storageKey,
        filename: originalFilename,
        size: selectedFile.size,
        type: selectedFile.type,
        expires_at: expires_at
      }).select();
      
      if (dbError) throw dbError;

      // 4. Atualizar lista de documentos
      await fetchUserDocuments(selectedUserId);

      // 5. Limpar formulário
      setSelectedFile(null);
      setDocumentName("");
      setExpirationDate(null);
      setNoExpiration(false);
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi enviado e está disponível para o usuário."
      });
    } catch (error: any) {
      console.error('Erro ao enviar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para excluir documento
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    try {
      // 1. Buscar informações do documento para obter o caminho do arquivo
      const { data: docData, error: fetchError } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (fetchError) throw fetchError;

      // 2. Excluir documento do banco de dados
      const { error: deleteDbError } = await supabase.from('documents').delete().eq('id', documentId);
      if (deleteDbError) throw deleteDbError;

      // 3. Excluir arquivo do Storage (usando o storage_key se disponível)
      if (docData) {
        let storagePath;
        
        if (docData.storage_key) {
          storagePath = docData.storage_key;
        } else if (docData.file_url) {
          const url = new URL(docData.file_url);
          const pathArray = url.pathname.split('/');
          storagePath = pathArray.slice(pathArray.indexOf('documents') + 1).join('/');
        }
        
        if (storagePath) {
          const { error: deleteStorageError } = await supabase.storage.from('documents').remove([storagePath]);
          if (deleteStorageError) {
            console.error('Erro ao excluir arquivo do storage:', deleteStorageError);
            // Continuamos mesmo com erro no storage pois o registro já foi excluído
          }
        }
      }

      // 4. Atualizar lista de documentos
      if (selectedUserId) {
        await fetchUserDocuments(selectedUserId);
      }
      toast({
        title: "Documento excluído com sucesso",
        description: "O documento foi removido permanentemente."
      });
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
        description: error.message
      });
    }
  };

  return {
    documents,
    selectedUserId,
    setSelectedUserId,
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    selectedFile,
    setSelectedFile,
    isLoadingDocuments,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    fetchUserDocuments,
    handleFileChange,
    handleUpload,
    handleDeleteDocument
  };
};
