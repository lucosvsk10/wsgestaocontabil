import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AdminLayout from "@/components/admin/layout/AdminLayout";
import { AdminDashboardView } from "@/components/admin/dashboard/AdminDashboardView";
import { UserList } from "@/components/admin/UserList";
import { UserDocumentView } from "@/components/admin/UserDocumentView";
import { StorageView } from "@/components/admin/StorageView";
import { PollsManager } from "@/components/admin/PollsManager";
import { ToolsView } from "@/components/admin/ToolsView";
import { TaxSimulationsView } from "@/components/admin/TaxSimulationsView";
import { SettingsView } from "@/components/admin/SettingsView";
import { useUserManagement } from "@/hooks/useUserManagement";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface AdminDashboardProps {
  activeTab?: string;
}

const AdminDashboard = ({ activeTab: initialActiveTab = "dashboard" }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialActiveTab);

  const {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    isCreatingUser,
    createUser,
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    changeUserPassword,
    refreshUsers
  } = useUserManagement();

  const passwordForm = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/admin/users")) {
      setActiveTab("users");
    } else if (path.includes("/admin/user-documents")) {
      setActiveTab("user-documents");
    } else if (path.includes("/admin/polls")) {
      setActiveTab("polls");
    } else if (path.includes("/admin/tools")) {
      setActiveTab("tools");
    } else if (path.includes("/admin/tax-simulations")) {
      setActiveTab("tax-simulations");
    } else if (path.includes("/admin/storage")) {
      setActiveTab("storage");
    } else if (path.includes("/admin/settings")) {
      setActiveTab("settings");
    } else {
      setActiveTab("dashboard");
    }
  }, [location.pathname]);

  const handlePasswordSubmit = async (data: { newPassword: string; confirmPassword: string }) => {
    if (!selectedUserForPasswordChange) return;

    if (data.newPassword !== data.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem"
      });
      return;
    }

    try {
      await changeUserPassword(data);
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso"
      });
      setSelectedUserForPasswordChange(null);
      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao alterar senha"
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
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
        return (
          <UserDocumentView
            users={users}
            supabaseUsers={supabaseUsers}
          />
        );
      case "polls":
        return <PollsManager />;
      case "tools":
        return <ToolsView />;
      case "tax-simulations":
        return <TaxSimulationsView />;
      case "storage":
        return <StorageView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <AdminDashboardView
            users={users}
            supabaseUsers={supabaseUsers}
            documents={[]}
          />
        );
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817]">
        {renderContent()}
        
        {selectedUserForPasswordChange && (
          <PasswordChangeForm />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
