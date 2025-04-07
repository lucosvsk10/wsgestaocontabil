
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ensureUserProfile } from "@/utils/authUtils";
import { UserType } from "@/types/admin";

export const useDocumentUpload = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Documentações");
  const [documentObservations, setDocumentObservations] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (!documentName) {
        setDocumentName(e.target.files[0].name.split('.')[0]);
      }
    }
  };

  const handleUpload = async (
    e: React.FormEvent,
    selectedUserId: string,
    supabaseUsers: any[],
    users: UserType[]
  ) => {
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
      const userEmail = supabaseUsers.find(u => u.id === selectedUserId)?.email || "";
      const userName = users.find(u => u.id === selectedUserId)?.name || "Usuário";
      
      const { data: userData, error: userError } = await ensureUserProfile(
        selectedUserId,
        userEmail,
        userName
      );
      
      if (userError) {
        console.error('Erro ao verificar/criar perfil do usuário:', userError);
        throw new Error("Não foi possível verificar ou criar o perfil do usuário. Por favor, tente novamente.");
      }
      
      if (!userData) {
        throw new Error("Não foi possível encontrar ou criar o perfil do usuário.");
      }
      
      console.log("Perfil do usuário confirmado:", userData);
      
      const storageKey = `${selectedUserId}/${uuidv4()}`;
      const originalFilename = selectedFile.name;
      
      const { data: fileData, error: uploadError } = await supabase.storage.from('documents').upload(storageKey, selectedFile);
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageKey);

      let expires_at = null;
      if (!noExpiration && expirationDate) {
        expires_at = expirationDate.toISOString();
      }

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
        expires_at: expires_at,
        observations: documentObservations || null,
        viewed: false
      }).select();
      
      if (dbError) throw dbError;

      await fetchUserDocuments(selectedUserId);
      setSelectedFile(null);
      setDocumentName("");
      setDocumentObservations("");
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

  return {
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    selectedFile,
    setSelectedFile,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    handleFileChange,
    handleUpload
  };
};
