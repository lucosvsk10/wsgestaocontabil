import { UserList } from "./UserList";
import { PollsTabView } from "./polls/PollsTabView";
import { UserDocumentView } from "./UserDocumentView";
import TaxSimulationResults from "./TaxSimulationResults";
import { UserType } from "@/types/admin";
import { Poll } from "@/types/polls";
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import { SettingsView } from "./settings/SettingsView";
import { AdminToolsView } from "./tools/AdminToolsView";
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
  return <div className="bg-navy-dark">
      <div className="mt-4 bg-navy-dark">
        {/* Tab Content - Dashboard */}
        {activeTab === "dashboard" && <AdminDashboardView users={users || []} supabaseUsers={supabaseUsers || []} documents={documents || []} />}

        {/* Tab Content - Users */}
        {activeTab === "users" && <div className="space-y-4 bg-navy-dark">
            {users && supabaseUsers && <UserList supabaseUsers={supabaseUsers} users={users} isLoading={isLoadingUsers || isLoadingAuthUsers} setSelectedUserId={handleDocumentButtonClick || (() => {})} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange || (() => {})} passwordForm={passwordForm || {}} refreshUsers={refreshUsers || (() => {})} />}
          </div>}

        {/* Tab Content - User Documents */}
        {activeTab === "user-documents" && <UserDocumentView users={users || []} supabaseUsers={supabaseUsers || []} />}

        {/* Tab Content - Polls */}
        {activeTab === "polls" && <div className="space-y-4">
            <PollsTabView />
          </div>}

        {/* Tab Content - Tools */}
        {activeTab === "tools" && <div className="space-y-4">
            <AdminToolsView />
          </div>}

        {/* Tab Content - Tax Simulations */}
        {activeTab === "tax-simulations" && <div className="space-y-4">
            <TaxSimulationResults />
          </div>}

        {/* Tab Content - Settings */}
        {activeTab === "settings" && <div className="space-y-4">
            <SettingsView />
          </div>}
      </div>
    </div>;
}