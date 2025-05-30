
import { UserList } from "./UserList";
import { PollsTabView } from "./polls/PollsTabView";
import { UserDocumentView } from "./UserDocumentView";
import { SimulationsView } from "./simulations/SimulationsView";
import { StorageView } from "./storage/StorageView";
import { UserType } from "@/types/admin";
import { Poll } from "@/types/polls";
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import { SettingsView } from "./settings/SettingsView";
import { AdminToolsView } from "./tools/AdminToolsView";
import { AnnouncementsView } from "./announcements/AnnouncementsView";

export interface AdminTabsViewProps {
  activeTab?: string;
  // Props para UserList
  users?: UserType[];
  supabaseUsers?: any[];
  userInfoList?: any[];
  isLoadingUsers?: boolean;
  isLoadingAuthUsers?: boolean;
  handleDocumentButtonClick?: (userId: string) => void;
  setSelectedUserForPasswordChange?: (user: UserType) => void;
  passwordForm?: any;
  refreshUsers?: () => void;
  createUser?: (data: any) => Promise<void>;
  isCreatingUser?: boolean;
  // Props para DocumentManager
  selectedUserId?: string | null;
  documentName?: string;
  setDocumentName?: (name: string) => void;
  documentCategory?: string;
  setDocumentCategory?: (category: string) => void;
  documentObservations?: string;
  setDocumentObservations?: (observations: string) => void;
  handleFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload?: (e: React.FormEvent) => Promise<void>;
  isUploading?: boolean;
  documents?: any[];
  isLoadingDocuments?: boolean;
  handleDeleteDocument?: (documentId: string) => Promise<void>;
  documentCategories?: string[];
  expirationDate?: Date | null;
  setExpirationDate?: (date: Date | null) => void;
  noExpiration?: boolean;
  setNoExpiration?: (value: boolean) => void;
  // Props para PollResults
  selectedPoll?: Poll | null;
}

export function AdminTabsView({
  activeTab,
  users,
  supabaseUsers,
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
  selectedPoll
}: AdminTabsViewProps) {
  return (
    <div className="w-full">
      <div className="mt-4">
        {/* Tab Content - Dashboard */}
        {activeTab === "dashboard" && <AdminDashboardView users={users || []} supabaseUsers={supabaseUsers || []} documents={documents || []} />}

        {/* Tab Content - Users */}
        {activeTab === "users" && <div className="space-y-8">
            {users && supabaseUsers && <UserList supabaseUsers={supabaseUsers} users={users} isLoading={isLoadingUsers || isLoadingAuthUsers} setSelectedUserId={handleDocumentButtonClick || (() => {})} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange || (() => {})} passwordForm={passwordForm || {}} refreshUsers={refreshUsers || (() => {})} />}
          </div>}

        {/* Tab Content - User Documents */}
        {activeTab === "user-documents" && <UserDocumentView users={users || []} supabaseUsers={supabaseUsers || []} />}

        {/* Tab Content - Storage */}
        {activeTab === "storage" && <div className="space-y-8">
            <StorageView />
          </div>}

        {/* Tab Content - Polls */}
        {activeTab === "polls" && <div className="space-y-8">
            <PollsTabView />
          </div>}

        {/* Tab Content - Tools */}
        {activeTab === "tools" && <div className="space-y-8">
            <AdminToolsView />
          </div>}

        {/* Tab Content - Simulations */}
        {activeTab === "simulations" && <div className="space-y-8">
            <SimulationsView />
          </div>}

        {/* Tab Content - Announcements */}
        {activeTab === "announcements" && <div className="space-y-8">
            <AnnouncementsView />
          </div>}

        {/* Tab Content - Settings */}
        {activeTab === "settings" && <div className="space-y-8">
            <SettingsView />
          </div>}
      </div>
    </div>
  );
}
