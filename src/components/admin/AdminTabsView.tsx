
import { DocumentManager } from "./DocumentManager";
import { UserTable } from "./UserTable";
import { PollsTabView } from "./polls/PollsTabView";
import { PollResults } from "./polls/PollResults";
import TaxSimulationResults from "./TaxSimulationResults";
import { UserType } from "@/types/admin";
import { Poll } from "@/types/polls";
import { UserList } from "./UserList";

export interface AdminTabsViewProps {
  activeTab?: string;
  // Props para UserTable
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
        {/* Tab Content - Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {users && supabaseUsers && (
              <UserList 
                supabaseUsers={supabaseUsers} 
                users={users} 
                isLoading={isLoadingUsers || isLoadingAuthUsers} 
                setSelectedUserId={handleDocumentButtonClick || (() => {})} 
                setSelectedUserForPasswordChange={setSelectedUserForPasswordChange || (() => {})} 
                passwordForm={passwordForm || {}} 
                refreshUsers={refreshUsers || (() => {})} 
              />
            )}
          </div>
        )}

        {/* Tab Content - Documents */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <DocumentManager 
              selectedUserId={selectedUserId} 
              documentName={documentName || ""} 
              setDocumentName={setDocumentName || (() => {})} 
              documentCategory={documentCategory || ""} 
              setDocumentCategory={setDocumentCategory || (() => {})} 
              documentObservations={documentObservations || ""} 
              setDocumentObservations={setDocumentObservations || (() => {})} 
              handleFileChange={handleFileChange || (() => {})} 
              handleUpload={handleUpload || (async () => {})} 
              isUploading={isUploading || false} 
              documents={documents || []} 
              isLoadingDocuments={isLoadingDocuments || false} 
              handleDeleteDocument={handleDeleteDocument || (async () => {})} 
              documentCategories={documentCategories || []} 
              expirationDate={expirationDate} 
              setExpirationDate={setExpirationDate || (() => {})} 
              noExpiration={noExpiration || false} 
              setNoExpiration={setNoExpiration || (() => {})} 
            />
          </div>
        )}

        {/* Tab Content - Polls */}
        {activeTab === "polls" && (
          <div className="space-y-4">
            <PollsTabView />
          </div>
        )}

        {/* Tab Content - Poll Results */}
        {activeTab === "poll-results" && (
          <div className="space-y-4">
            <PollResults selectedPoll={selectedPoll || null} />
          </div>
        )}

        {/* Tab Content - Tax Simulations */}
        {activeTab === "tax-simulations" && (
          <div className="space-y-4">
            <TaxSimulationResults />
          </div>
        )}

        {/* Tab Content - Settings */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Configurações gerais do sistema serão adicionadas aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
