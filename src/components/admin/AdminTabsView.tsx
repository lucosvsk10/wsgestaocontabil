
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import { UserTable } from "./UserTable";
import { StorageView } from "./storage/StorageView";
import { PollsTabView } from "./polls/PollsTabView";
import { AdminToolsView } from "./tools/AdminToolsView";
import { SimulationsView } from "./simulations/SimulationsView";
import { AgendaView } from "./agenda/AgendaView";
import { AnnouncementsView } from "./announcements/AnnouncementsView";
import { SettingsView } from "./settings/SettingsView";
import { DocumentManagementView } from "./document-management/DocumentManagementView";

interface AdminTabsViewProps {
  activeTab: string;
  supabaseUsers: any[];
  users: any[];
  userInfoList: any[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: any;
  refreshUsers: () => void;
  createUser: (data: any) => void;
  isCreatingUser: boolean;
  selectedUserId: string | null;
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  documentObservations: string;
  setDocumentObservations: (observations: string) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  isUploading: boolean;
  documents: any[];
  isLoadingDocuments: boolean;
  handleDeleteDocument: (id: string) => void;
  documentCategories: string[];
  expirationDate: string;
  setExpirationDate: (date: string) => void;
  noExpiration: boolean;
  setNoExpiration: (noExpiration: boolean) => void;
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
  setNoExpiration 
}: AdminTabsViewProps) => {
  return (
    <div className="h-full w-full">
      <Tabs value={activeTab} className="h-full">
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="h-full">
          <AdminDashboardView />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="h-full">
          <UserTable 
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
        </TabsContent>

        {/* User Documents Tab */}
        <TabsContent value="user-documents" className="h-full">
          <DocumentManagementView 
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
          />
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="h-full">
          <StorageView />
        </TabsContent>

        {/* Polls Tab */}
        <TabsContent value="polls" className="h-full">
          <PollsTabView />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="h-full">
          <AdminToolsView />
        </TabsContent>

        {/* Simulations Tab */}
        <TabsContent value="simulations" className="h-full">
          <SimulationsView />
        </TabsContent>

        {/* Agenda Tab */}
        <TabsContent value="agenda" className="h-full">
          <AgendaView />
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="h-full">
          <AnnouncementsView />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="h-full">
          <SettingsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
