
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";
import { AdminDocumentManager } from "./document-management/AdminDocumentManager";
import { UserType } from "@/types/admin";

interface UserDocumentViewProps {
  users?: UserType[];
  supabaseUsers?: any[];
}

export const UserDocumentView = ({ users = [], supabaseUsers = [] }: UserDocumentViewProps) => {
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
    return (
      <Card className="px-0 bg-white border border-[#e6e6e6] shadow-sm dark:bg-transparent dark:border dark:border-[#efc349]">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-[#6b7280] mb-4 dark:text-[#d9d9d9]">Nenhum usuário selecionado</p>
            <Button variant="outline" className="mt-2 bg-white border-[#e6e6e6] hover:bg-gray-50 text-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349] dark:hover:text-[#020817]" onClick={handleBackToUserList}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar para lista de usuários
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="px-0 bg-white border border-[#e6e6e6] shadow-sm dark:bg-transparent dark:border dark:border-[#efc349]">
      <CardHeader className="border-b border-[#e6e6e6] px-6 dark:border-[#efc349]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Button variant="outline" size="sm" onClick={handleBackToUserList} className="flex items-center gap-1 bg-white border-[#e6e6e6] hover:bg-gray-50 text-[#020817] mb-3 dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349] dark:hover:text-[#020817]">
              <ArrowLeft size={16} className="text-[#efc349]" />
              Voltar para lista de usuários
            </Button>
            <CardTitle className="text-xl text-[#020817] font-medium dark:text-[#efc349]">
              Gerenciando documentos de usuário
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AdminDocumentManager 
          userId={userId} 
          userName={userName} 
          userEmail={userEmail} 
          documents={documents} 
          isLoadingDocuments={isLoadingDocuments} 
          loadingDocumentIds={loadingDocumentIds} 
          handleDownload={handleDownload} 
          handleDeleteDocument={handleDeleteDocument} 
        />
      </CardContent>
    </Card>
  );
};
