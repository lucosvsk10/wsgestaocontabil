
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import UserManagementView from "./UserManagementView";
import { StorageView } from "./storage/StorageView";
import { PollsTabView } from "./polls/PollsTabView";
import { AdminToolsView } from "./tools/AdminToolsView";
import { AllSimulationsView } from "./simulations/AllSimulationsView";
import { AnnouncementsView } from "./announcements/AnnouncementsView";
import FiscalCalendar from "./FiscalCalendar";
import { SettingsView } from "./settings/SettingsView";
import { AdminDocumentView } from "./AdminDocumentView";
import { UseFormReturn } from "react-hook-form";

interface AdminTabsViewProps {
  activeTab: string;
  supabaseUsers: any[];
  users: any[];
  userInfoList: any[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: UseFormReturn<any>;
  refreshUsers: () => void;
  createUser: (data: any) => Promise<void>;
  isCreatingUser: boolean;
  selectedUserId: string | undefined;
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  documentObservations: string;
  setDocumentObservations: (observations: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUpload: () => Promise<void>;
  isUploading: boolean;
  documents: any[];
  isLoadingDocuments: boolean;
  handleDeleteDocument: (documentId: string) => Promise<void>;
  documentCategories: string[];
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (noExpiration: boolean) => void;
}

const AdminTabsView = ({
  activeTab,
  supabaseUsers,
  users,
  userInfoList,
  isLoadingUsers,
  isLoadingAuthUsers,
  handleDocumentButtonClick,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  createUser,
  isCreatingUser,
  selectedUserId,
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
  documentObservations,
  setDocumentObservations,
  handleFileChange,
  handleUpload,
  isUploading,
  documents,
  isLoadingDocuments,
  handleDeleteDocument,
  documentCategories,
  expirationDate,
  setExpirationDate,
  noExpiration,
  setNoExpiration
}: AdminTabsViewProps) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboardView users={users} supabaseUsers={supabaseUsers} documents={documents} />;
      case "users":
        return (
          <UserManagementView 
            supabaseUsers={supabaseUsers}
            users={users}
            userInfoList={userInfoList}
            isLoadingUsers={isLoadingUsers}
            isLoadingAuthUsers={isLoadingAuthUsers}
            handleDocumentButtonClick={handleDocumentButtonClick}
            setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
            passwordForm={passwordForm}
            refreshUsers={refreshUsers}
            createUser={createUser}
            isCreatingUser={isCreatingUser}
          />
        );
      case "storage":
        return <StorageView />;
      case "polls":
        return <PollsTabView />;
      case "tools":
        return <AdminToolsView />;
      case "simulations":
        return <AllSimulationsView />;
      case "announcements":
        return <AnnouncementsView />;
      case "agenda":
        return <FiscalCalendar />;
      case "settings":
        return <SettingsView />;
      case "user-documents":
        const selectedUser = users.find(user => user.id === selectedUserId) || supabaseUsers.find(user => user.id === selectedUserId);
        const userName = selectedUser?.name || selectedUser?.email || 'Usuário';
        
        return (
          <AdminDocumentView 
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
            documentCategories={documentCategories}
            expirationDate={expirationDate}
            setExpirationDate={setExpirationDate}
            noExpiration={noExpiration}
            setNoExpiration={setNoExpiration}
            handleBackToUserList={() => window.history.back()}
            userName={userName}
          />
        );
      default:
        return <AdminDashboardView users={users} supabaseUsers={supabaseUsers} documents={documents} />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      {renderTabContent()}
    </div>
  );
};

export default AdminTabsView;
