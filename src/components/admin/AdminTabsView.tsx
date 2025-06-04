
import { useParams } from "react-router-dom";
import { AdminDashboardView } from "./dashboard/AdminDashboardView";
import { UserList } from "./UserList";
import { DocumentManagementView } from "./document-management/DocumentManagementView";
import { StorageView } from "./storage/StorageView";
import { PollsTabView } from "./polls/PollsTabView";
import { AdminToolsView } from "./tools/AdminToolsView";
import { SimulationsView } from "./simulations/SimulationsView";
import { AnnouncementsTabView } from "./announcements/AnnouncementsTabView";
import { FiscalCalendar } from "./FiscalCalendar";
import { SettingsView } from "./settings/SettingsView";
import { CompanyDataView } from "./company/CompanyDataView";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useForm } from "react-hook-form";
import { AdminPasswordChangeModal } from "./AdminPasswordChangeModal";

interface AdminTabsViewProps {
  activeTab: string;
}

export const AdminTabsView = ({ activeTab }: AdminTabsViewProps) => {
  const { userId } = useParams();
  const {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    changeUserPassword,
    refreshUsers
  } = useUserManagement();

  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);
  
  const passwordForm = useForm({
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const handlePasswordChange = async (data: { password: string; confirmPassword: string }) => {
    if (!selectedUserForPasswordChange) return;
    
    if (data.password !== data.confirmPassword) {
      throw new Error("As senhas não coincidem");
    }
    
    await changeUserPassword(selectedUserForPasswordChange.id, data.password);
    setSelectedUserForPasswordChange(null);
    passwordForm.reset();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboardView />;
      case "users":
        return (
          <UserList 
            supabaseUsers={supabaseUsers}
            users={users}
            isLoading={isLoadingUsers || isLoadingAuthUsers}
            setSelectedUserId={() => {}}
            setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
            passwordForm={passwordForm}
            refreshUsers={refreshUsers}
          />
        );
      case "user-documents":
        return <DocumentManagementView />;
      case "company-data":
        return userId ? <CompanyDataView userId={userId} /> : <div>ID do usuário não encontrado</div>;
      case "storage":
        return <StorageView />;
      case "polls":
        return <PollsTabView />;
      case "tools":
        return <AdminToolsView />;
      case "simulations":
        return <SimulationsView />;
      case "announcements":
        return <AnnouncementsTabView />;
      case "agenda":
        return <FiscalCalendar />;
      case "settings":
        return <SettingsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <>
      {renderTabContent()}
      
      <AdminPasswordChangeModal
        isOpen={!!selectedUserForPasswordChange}
        onClose={() => {
          setSelectedUserForPasswordChange(null);
          passwordForm.reset();
        }}
        onSubmit={handlePasswordChange}
        isLoading={isChangingPassword}
        form={passwordForm}
        user={selectedUserForPasswordChange}
      />
    </>
  );
};
