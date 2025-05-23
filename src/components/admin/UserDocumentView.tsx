
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
    return <Card className="px-0 bg-white dark:bg-transparent border border-gray-200 dark:border-gold dark:border-opacity-20 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-[#d9d9d9] mb-4">Nenhum usuário selecionado</p>
            <Button variant="outline" className="mt-2 bg-white dark:bg-transparent dark:border-gold dark:border-opacity-20 dark:text-gold hover:bg-gold/10 dark:hover:bg-gold/20 hover:text-navy dark:hover:text-gold" onClick={handleBackToUserList}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar para lista de usuários
            </Button>
          </div>
        </CardContent>
      </Card>;
  }
  
  return <Card className="px-0 bg-white dark:bg-transparent border border-gray-200 dark:border-gold dark:border-opacity-20 shadow-lg">
      <CardHeader className="border-b border-gray-200 dark:border-gold dark:border-opacity-20 px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Button variant="outline" size="sm" onClick={handleBackToUserList} className="flex items-center gap-1 bg-white dark:bg-transparent dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold/20 dark:hover:text-navy border border-gold/20 shadow-sm mb-3">
              <ArrowLeft size={16} />
              Voltar para lista de usuários
            </Button>
            <CardTitle className="text-xl text-navy dark:text-gold font-extralight">
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
    </Card>;
};
