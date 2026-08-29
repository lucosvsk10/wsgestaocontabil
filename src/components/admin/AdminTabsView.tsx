import { UserList } from "./UserList";
import { PollsTabView } from "./polls/PollsTabView";
import { UserDocumentView } from "./UserDocumentView";
import { SimulationsView } from "./simulations/SimulationsView";
import { StorageView } from "./storage/StorageView";
import FiscalCalendar from "./FiscalCalendar";
import { UserType } from "@/types/admin";
import { Poll } from "@/types/polls";
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import { SettingsView } from "./settings/SettingsView";
import { AdminToolsView } from "./tools/AdminToolsView";
import { AnnouncementsView } from "./announcements/AnnouncementsView";
import { AdminPage } from "./ui/AdminPage";

export interface AdminTabsViewProps { activeTab?: string; users?: UserType[]; supabaseUsers?: any[]; userInfoList?: any[]; isLoadingUsers?: boolean; isLoadingAuthUsers?: boolean; handleDocumentButtonClick?: (userId:string)=>void; setSelectedUserForPasswordChange?: (user:UserType)=>void; passwordForm?:any; refreshUsers?:()=>void; createUser?:(data:any)=>Promise<void>; isCreatingUser?:boolean; selectedUserId?:string|null; documentName?:string; setDocumentName?:(name:string)=>void; documentCategory?:string; setDocumentCategory?:(category:string)=>void; documentObservations?:string; setDocumentObservations?:(observations:string)=>void; handleFileChange?:(e:React.ChangeEvent<HTMLInputElement>)=>void; handleUpload?:(e:React.FormEvent)=>Promise<void>; isUploading?:boolean; documents?:any[]; isLoadingDocuments?:boolean; handleDeleteDocument?:(documentId:string)=>Promise<void>; documentCategories?:string[]; expirationDate?:Date|null; setExpirationDate?:(date:Date|null)=>void; noExpiration?:boolean; setNoExpiration?:(value:boolean)=>void; selectedPoll?:Poll|null; }

export function AdminTabsView(props:AdminTabsViewProps){
 const {activeTab,users=[],supabaseUsers=[],isLoadingUsers,isLoadingAuthUsers,handleDocumentButtonClick,setSelectedUserForPasswordChange,passwordForm,refreshUsers,documents=[]}=props;
 if(activeTab==='user-documents') return <UserDocumentView users={users} supabaseUsers={supabaseUsers}/>;
 const preserveApprovedSurface=activeTab==='dashboard'||activeTab==='storage';
 return <AdminPage className={`min-h-full ${preserveApprovedSurface?'':'ws-admin-polish'}`}>
   {activeTab==='dashboard'&&<AdminDashboardView users={users} supabaseUsers={supabaseUsers} documents={documents}/>} 
   {activeTab==='users'&&<UserList supabaseUsers={supabaseUsers} users={users} isLoading={isLoadingUsers||isLoadingAuthUsers} setSelectedUserId={handleDocumentButtonClick||(()=>{})} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange||(()=>{})} passwordForm={passwordForm||{}} refreshUsers={refreshUsers||(()=>{})}/>} 
   {activeTab==='storage'&&<StorageView/>}
   {activeTab==='polls'&&<PollsTabView/>}
   {activeTab==='tools'&&<AdminToolsView/>}
   {activeTab==='simulations'&&<SimulationsView/>}
   {activeTab==='announcements'&&<AnnouncementsView/>}
   {activeTab==='agenda'&&<FiscalCalendar/>}
   {activeTab==='settings'&&<SettingsView/>}
 </AdminPage>;
}
