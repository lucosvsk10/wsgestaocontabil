import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentManager } from "@/hooks/document/useDocumentManager";
import { useUserManagement } from "@/hooks/useUserManagement";
import { AdminTabsView } from "@/components/admin/AdminTabsView";
import { AdminPasswordChangeModal } from "@/components/admin/AdminPasswordChangeModal";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { useForm } from "react-hook-form";
import { useUsersFetch } from "@/hooks/useUsersFetch";
import { useCompanySelection } from "@/contexts/CompanySelectionContext";

interface AdminDashboardProps { activeTab: string; }

const AdminDashboard = ({ activeTab = "dashboard" }: AdminDashboardProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompanySelection();
  const passwordForm = useForm({ defaultValues: { newPassword: '', confirmPassword: '' } });
  const { users, supabaseUsers, isLoadingUsers, isLoadingAuthUsers, isCreatingUser, createUser, selectedUserForPasswordChange, setSelectedUserForPasswordChange, isChangingPassword, changeUserPassword, fetchAuthUsers, fetchUsers } = useUserManagement();
  const { refreshUsers } = useUsersFetch();
  const { documents, selectedUserId, setSelectedUserId, isUploading, documentName, setDocumentName, documentCategory, setDocumentCategory, documentObservations, setDocumentObservations, expirationDate, setExpirationDate, noExpiration, setNoExpiration, isLoadingDocuments, handleFileChange, handleUpload, handleDeleteDocument } = useDocumentManager(users, supabaseUsers);
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false);
  const documentCategories = ["Imposto de Renda", "Documentações", "Certidões"];

  useEffect(() => { if (!isInitialized) { fetchUsers(); fetchAuthUsers(); setIsInitialized(true); } }, [isInitialized, fetchUsers, fetchAuthUsers]);
  useEffect(() => { if (activeTab === "user-documents" && userId) setSelectedUserId(userId); }, [activeTab, userId, setSelectedUserId]);
  useEffect(() => {
    if (activeTab !== "user-documents" || !selectedCompany?.portal_user_id) return;
    if (selectedCompany.portal_user_id !== userId) navigate(`/admin/user-documents/${selectedCompany.portal_user_id}`, { replace: true });
  }, [activeTab, navigate, selectedCompany?.portal_user_id, userId]);

  return <AdminLayout>
    <AdminTabsView activeTab={activeTab} supabaseUsers={supabaseUsers} users={users} userInfoList={users} isLoadingUsers={isLoadingUsers} isLoadingAuthUsers={isLoadingAuthUsers} handleDocumentButtonClick={(id)=>navigate(`/admin/user-documents/${id}`)} setSelectedUserForPasswordChange={user=>{setSelectedUserForPasswordChange(user);setPasswordChangeModalOpen(true)}} passwordForm={passwordForm} refreshUsers={refreshUsers} createUser={createUser} isCreatingUser={isCreatingUser} selectedUserId={selectedUserId} documentName={documentName} setDocumentName={setDocumentName} documentCategory={documentCategory} setDocumentCategory={setDocumentCategory} documentObservations={documentObservations} setDocumentObservations={setDocumentObservations} handleFileChange={handleFileChange} handleUpload={handleUpload} isUploading={isUploading} documents={documents} isLoadingDocuments={isLoadingDocuments} handleDeleteDocument={handleDeleteDocument} documentCategories={documentCategories} expirationDate={expirationDate} setExpirationDate={setExpirationDate} noExpiration={noExpiration} setNoExpiration={setNoExpiration} />
    <AdminPasswordChangeModal selectedUserForPasswordChange={selectedUserForPasswordChange} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} changeUserPassword={changeUserPassword} isChangingPassword={isChangingPassword} passwordForm={passwordForm} passwordChangeModalOpen={passwordChangeModalOpen} setPasswordChangeModalOpen={setPasswordChangeModalOpen} />
  </AdminLayout>;
};
export default AdminDashboard;
