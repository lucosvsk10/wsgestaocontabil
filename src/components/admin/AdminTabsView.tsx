
import { AdminDashboard } from "./dashboard/AdminDashboard";
import { UsersView } from "./users/UsersView";
import { StorageView } from "./storage/StorageView";
import { PollsTabView } from "./polls/PollsTabView";
import { SimulationsView } from "./simulations/SimulationsView";
import { AdminToolsView } from "./tools/AdminToolsView";
import TaxSimulationResults from "./TaxSimulationResults";
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
  passwordForm: UseFormReturn<any, any, undefined>;
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
  handleBackToUserList?: () => void;
  userName?: string;
}

export const AdminTabsView = ({
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
  setNoExpiration,
  handleBackToUserList,
  userName
}: AdminTabsViewProps) => {
  const tabComponents = {
    dashboard: <AdminDashboard users={users} supabaseUsers={supabaseUsers} documents={documents} />,
    users: <UsersView 
      users={userInfoList}
      supabaseUsers={supabaseUsers}
      isLoadingUsers={isLoadingUsers}
      isLoadingAuthUsers={isLoadingAuthUsers}
      handleDocumentButtonClick={handleDocumentButtonClick}
      setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
      passwordForm={passwordForm}
      refreshUsers={refreshUsers}
      createUser={createUser}
      isCreatingUser={isCreatingUser}
    />,
    storage: <StorageView />,
    polls: <PollsTabView />,
    simulations: <SimulationsView />,
    tools: <AdminToolsView />,
    "tax-simulations": <TaxSimulationResults />,
    settings: <SettingsView />,
    "user-documents": <AdminDocumentView 
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
      handleBackToUserList={handleBackToUserList || (() => {})}
      userName={userName || ""}
    />
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817]">
      {tabComponents[activeTab as keyof typeof tabComponents] || tabComponents.dashboard}
    </div>
  );
};
