import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";
import { AdminDocumentManager } from "./document-management/AdminDocumentManager";
import { UserType } from "@/types/admin";
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";
import { useCompanySelection } from "@/contexts/CompanySelectionContext";

interface UserDocumentViewProps { users?: UserType[]; supabaseUsers?: any[]; }
export const UserDocumentView = ({ users = [], supabaseUsers = [] }: UserDocumentViewProps) => {
  const { userId } = useParams<{ userId: string }>();
  const { selectedCompany } = useCompanySelection();
  const [userName,setUserName]=useState('Cliente');
  const [userEmail,setUserEmail]=useState('');
  const { documents,setSelectedUserId,isLoadingDocuments,loadingDocumentIds,handleDownload,handleDeleteDocument }=useDocumentManagement(users,supabaseUsers);

  useEffect(()=>{
    if(!userId)return;
    setSelectedUserId(userId);
    const auth=supabaseUsers.find(user=>user.id===userId);
    const fallback=users.find((user:any)=>user.id===userId || user.user_id===userId);
    setUserName(auth?.user_metadata?.name||fallback?.name||selectedCompany?.trade_name||selectedCompany?.company_name||'Cliente');
    setUserEmail(auth?.email||fallback?.email||'');
  },[userId,setSelectedUserId,supabaseUsers,users,selectedCompany?.id]);

  if(!userId)return <AdminPage><AdminSection className="mt-6"><AdminEmptyState icon={<FileText className="h-8 w-8"/>} title="Nenhum cliente selecionado" description="Escolha uma empresa no topo do Admin."/></AdminSection></AdminPage>;

  return <AdminPage>
    <AdminPageHeader eyebrow="Clientes do escritório" title="Documentos do cliente" description={`Envie, acompanhe e organize os documentos de ${selectedCompany?.trade_name||selectedCompany?.company_name||userName}. A empresa acompanha o seletor global do topo.`}/>
    <div className="mt-6"><AdminDocumentManager userId={userId} userName={userName} userEmail={userEmail} documents={documents} isLoadingDocuments={isLoadingDocuments} loadingDocumentIds={loadingDocumentIds} handleDownload={handleDownload} handleDeleteDocument={handleDeleteDocument}/></div>
  </AdminPage>;
};
