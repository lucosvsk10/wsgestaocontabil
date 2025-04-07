import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { CreateUser } from "@/components/admin/CreateUser";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { UserType } from "@/types/admin";
interface AdminTabsViewProps {
  supabaseUsers: any[];
  users: UserType[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
  createUser: (data: any) => void;
  isCreatingUser: boolean;
}
export const AdminTabsView = ({
  supabaseUsers,
  users,
  isLoadingUsers,
  isLoadingAuthUsers,
  handleDocumentButtonClick,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  createUser,
  isCreatingUser
}: AdminTabsViewProps) => {
  return <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid grid-cols-3 mb-4 bg-[[#e8cc81] bg-[#e8cc81]">
        <TabsTrigger value="users">Lista de Usuários</TabsTrigger>
        <TabsTrigger value="create-user">Criar Usuário</TabsTrigger>
        <TabsTrigger value="change-password">Alterar Senha</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users" className="space-y-6">
        <UserList supabaseUsers={supabaseUsers} users={users} isLoading={isLoadingUsers || isLoadingAuthUsers} setSelectedUserId={handleDocumentButtonClick} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} passwordForm={passwordForm} refreshUsers={refreshUsers} />
      </TabsContent>
      
      <TabsContent value="create-user">
        <CreateUser createUser={createUser} isCreatingUser={isCreatingUser} />
      </TabsContent>
      
      <TabsContent value="change-password">
        <PasswordChangeForm />
      </TabsContent>
    </Tabs>;
};