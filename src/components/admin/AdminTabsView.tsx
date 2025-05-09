
import { DocumentManager } from "./DocumentManager";
import { UserTable } from "./UserTable";
import { PollsTabView } from "./polls/PollsTabView";
import { PollResults } from "./polls/PollResults";
import TaxSimulationResults from "./TaxSimulationResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { User, FileText, ChartBar, ChartPie, Calculator } from "lucide-react";
import { UserType } from "@/types/admin";
import { Poll } from "@/types/polls";

export interface AdminTabsViewProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  // Props necessárias para UserTable
  users?: any[];
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
  // Props para PollResults
  selectedPoll?: Poll | null;
}

export function AdminTabsView({ 
  activeTab, 
  onTabChange,
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
  selectedPoll
}: AdminTabsViewProps) {
  return (
    <div className="w-full">
      <Tabs defaultValue={activeTab || "documents"} onValueChange={onTabChange}>
        <div className="border-b border-gray-200 dark:border-gray-800">
          <TabsList className="h-10 w-full md:w-auto flex overflow-x-auto">
            <TabsTrigger value="documents" className="flex-none">
              <FileText className="mr-2 h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-none">
              <User className="mr-2 h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex-none">
              <ChartBar className="mr-2 h-4 w-4" />
              Enquetes
            </TabsTrigger>
            <TabsTrigger value="poll-results" className="flex-none">
              <ChartPie className="mr-2 h-4 w-4" />
              Resultados de Enquetes
            </TabsTrigger>
            <TabsTrigger value="tax-simulations" className="flex-none">
              <Calculator className="mr-2 h-4 w-4" />
              Simulações IRPF
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-4">
          <TabsContent value="documents" className="space-y-4">
            <DocumentManager 
              selectedUserId={null} 
              documentName="" 
              setDocumentName={() => {}} 
              documentCategory="" 
              setDocumentCategory={() => {}} 
              documentObservations="" 
              setDocumentObservations={() => {}} 
              handleFileChange={() => {}} 
              handleUpload={async () => {}} 
              isUploading={false} 
              documents={[]} 
              isLoadingDocuments={false} 
              handleDeleteDocument={async () => {}} 
              documentCategories={[]} 
              expirationDate={null} 
              setExpirationDate={() => {}} 
              noExpiration={false} 
              setNoExpiration={() => {}} 
            />
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            {users && supabaseUsers && (
              <UserTable 
                users={supabaseUsers} 
                userInfoList={userInfoList || []} 
                title="Usuários" 
                setSelectedUserId={handleDocumentButtonClick} 
                setSelectedUserForPasswordChange={setSelectedUserForPasswordChange || (() => {})} 
                passwordForm={passwordForm || {}} 
                refreshUsers={refreshUsers || (() => {})} 
              />
            )}
          </TabsContent>
          <TabsContent value="polls" className="space-y-4">
            <PollsTabView />
          </TabsContent>
          <TabsContent value="poll-results" className="space-y-4">
            <PollResults selectedPoll={selectedPoll || null} />
          </TabsContent>
          <TabsContent value="tax-simulations" className="space-y-4">
            <TaxSimulationResults />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
