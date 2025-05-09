
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { useUserInfo } from "@/hooks/useUserInfo";
import { useDocumentManager } from "@/hooks/document/useDocumentManager";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface UserDocumentViewProps {
  users: any[];
  supabaseUsers: any[];
}

export const UserDocumentView = ({ users, supabaseUsers }: UserDocumentViewProps) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const { getUserInfo } = useUserInfo();
  
  const {
    documents,
    selectedUserId,
    setSelectedUserId,
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    isLoadingDocuments,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    handleFileChange,
    handleUpload,
    handleDeleteDocument
  } = useDocumentManager(users, supabaseUsers);

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
      <Card className="px-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Nenhum usuário selecionado</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleBackToUserList}
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar para lista de usuários
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="px-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
      <CardHeader className="border-b border-gray-200 dark:border-gold/20 px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToUserList} 
              className="flex items-center gap-1 bg-white dark:bg-navy-light/80 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border border-gold/20 shadow-sm mb-2"
            >
              <ArrowLeft size={16} />
              Voltar para lista de usuários
            </Button>
            <CardTitle className="text-xl font-medium text-navy dark:text-gold">
              Gerenciando documentos de: {userName} - {userEmail}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <DocumentManager 
          selectedUserId={selectedUserId} 
          documentName={documentName} 
          setDocumentName={setDocumentName} 
          documentCategory={documentCategory} 
          setDocumentCategory={setDocumentCategory} 
          documentObservations={documentObservations} 
          setDocumentObservations={setDocumentObservations} 
          handleFileChange={handleFileChange} 
          handleUpload={handleUpload} 
          isUploading={isUploading} 
          documents={documents} 
          isLoadingDocuments={isLoadingDocuments} 
          handleDeleteDocument={handleDeleteDocument} 
          documentCategories={["Imposto de Renda", "Documentações", "Certidões"]} 
          expirationDate={expirationDate} 
          setExpirationDate={setExpirationDate} 
          noExpiration={noExpiration} 
          setNoExpiration={setNoExpiration} 
        />
      </CardContent>
    </Card>
  );
};
