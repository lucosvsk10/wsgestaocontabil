
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ensureUserProfile } from "@/utils/auth/userProfile";
import { UserType } from "@/types/admin";

export const useDocumentUploader = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadDocument = async (
    e: React.FormEvent,
    uploadData: {
      selectedUserId: string,
      documentName: string,
      documentCategory: string,
      documentObservations: string,
      selectedFile: File | null,
      expirationDate: Date | null,
      noExpiration: boolean
    },
    users: {
      supabaseUsers: any[],
      userProfiles: UserType[]
    }
  ) => {
    e.preventDefault();
    const { 
      selectedUserId, 
      documentName, 
      documentCategory, 
      documentObservations, 
      selectedFile,
      expirationDate,
      noExpiration
    } = uploadData;
    const { supabaseUsers, userProfiles } = users;

    // Validation checks
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
      // Obter informações do usuário selecionado
      const userEmail = supabaseUsers.find(u => u.id === selectedUserId)?.email || "";
      const userName = userProfiles.find(u => u.id === selectedUserId)?.name || "Usuário";
      
      // Garantir que o usuário existe na tabela users antes de prosseguir
      const { data: profileData, error: profileError } = await ensureUserProfile(
        selectedUserId,
        userEmail,
        userName
      );
      
      if (profileError) {
        console.warn("Aviso ao verificar perfil do usuário:", profileError);
        toast({
          variant: "destructive",
          title: "Aviso",
          description: "Continuando mesmo com problemas ao verificar perfil do usuário. Isso pode afetar o funcionamento."
        });
      }
      
      // Usar o userId para organizar os arquivos por usuário no storage
      const storageKey = `${selectedUserId}/${uuidv4()}_${selectedFile.name}`;
      const originalFilename = selectedFile.name;
      
      // Fazer upload do arquivo para o storage usando o bucket 'documents'
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storageKey, selectedFile);
      
      if (uploadError) {
        console.error("Erro ao fazer upload:", uploadError);
        throw uploadError;
      }

      // Obter URL público do arquivo
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storageKey);

      // Configurar data de expiração, se aplicável
      let expires_at = null;
      if (!noExpiration && expirationDate) {
        expires_at = expirationDate.toISOString();
      }

      // Verificar sessão ativa atual
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Sessão atual:", sessionData?.session?.user?.email || "Nenhuma sessão");

      await saveDocumentToDB(selectedUserId, documentName, documentCategory, documentObservations, 
        urlData.publicUrl, originalFilename, storageKey, selectedFile, expires_at);
      
      // Atualizar lista de documentos
      await fetchUserDocuments(selectedUserId);
      
      // Limpar formulário
      resetForm();
      
      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi enviado e está disponível para o usuário."
      });
    } catch (error: any) {
      console.error('Erro ao enviar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: error.message || "Ocorreu um erro ao tentar enviar o documento. Tente novamente."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const saveDocumentToDB = async (
    userId: string, 
    name: string, 
    category: string, 
    observations: string, 
    fileUrl: string, 
    originalFilename: string,
    storageKey: string,
    file: File,
    expiresAt: string | null
  ) => {
    try {
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          name: name,
          category: category,
          file_url: fileUrl,
          original_filename: originalFilename,
          storage_key: storageKey, // Salvar o caminho completo para uso posterior
          filename: originalFilename,
          size: file.size,
          type: file.type,
          expires_at: expiresAt,
          observations: observations || null,
          viewed: false
        });
      
      if (dbError) {
        console.error("Erro detalhado ao inserir documento:", dbError);
        
        // Tente fazer um fallback para garantir que o documento seja inserido
        console.log("Tentando inserção alternativa...");
        
        // Nova tentativa após verificar erro
        const { data: retryData, error: retryError } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            name: name,
            category: category,
            file_url: fileUrl,
            original_filename: originalFilename,
            storage_key: storageKey,
            filename: originalFilename,
            size: file.size,
            type: file.type,
            expires_at: expiresAt,
            observations: observations || null,
            viewed: false
          });
          
        if (retryError) {
          throw new Error(`Erro ao salvar documento no banco: ${retryError.message || retryError.details || 'Verifique as permissões'}`);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const resetForm = () => {
    // This will be handled by the main hook
  };

  return {
    isUploading,
    uploadDocument
  };
};
