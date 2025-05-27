import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";
import { AdminDocumentManager } from "./document-management/AdminDocumentManager";
import { UserType } from "@/types/admin";
interface UserDocumentViewProps {
  users?: UserType[];
  supabaseUsers?: any[];
}
export const UserDocumentView = ({
  users = [],
  supabaseUsers = []
}: UserDocumentViewProps) => {
  const {
    userId
  } = useParams<{
    userId: string;
  }>();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const {
    documents,
    selectedUserId,
    setSelectedUserId,
    isLoadingDocuments,
    loadingDocumentIds,
    handleDownload,
    handleDeleteDocument
  } = useDocumentManagement(users, supabaseUsers);

  // Effect to set the selected user ID when the component mounts
  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);

      // Find user information
      const authUser = supabaseUsers.find(user => user.id === userId);
      if (authUser) {
        setUserName(authUser.user_metadata?.name || 'Usuário');
        setUserEmail(authUser.email || 'Sem email');
      }
    }
  }, [userId, setSelectedUserId, supabaseUsers]);
  const handleBackToUserList = () => {
    navigate("/admin/users");
  };
  if (!userId) {
    return <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#efc349]/10 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-8 h-8 text-gray-400 dark:text-[#efc349]" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-[#020817] dark:text-white mb-3">Nenhum usuário selecionado</h3>
            <p className="text-gray-500 dark:text-white/70">Selecione um usuário para gerenciar seus documentos</p>
          </div>
          <Button variant="outline" onClick={handleBackToUserList} className="transition-all duration-300 hover:scale-105">
            <ArrowLeft size={16} className="mr-2" />
            Voltar para lista de usuários
          </Button>
        </div>
      </div>;
  }
  return <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={handleBackToUserList} className="flex items-center gap-2 transition-all duration-300 hover:scale-105 dark:hover:bg-[#efc349]/10">
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] font-extralight">Documentos do Usuário</h1>
          <p className="text-gray-600 dark:text-white/70 mt-2">Gerencie os documentos de {userName}</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <AdminDocumentManager userId={userId} userName={userName} userEmail={userEmail} documents={documents} isLoadingDocuments={isLoadingDocuments} loadingDocumentIds={loadingDocumentIds} handleDownload={handleDownload} handleDeleteDocument={handleDeleteDocument} />
      </div>
    </div>;
};