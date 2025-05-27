
import { ModernAdminDashboard } from "./ModernAdminDashboard";

interface AdminDashboardViewProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const AdminDashboardView = ({
  users,
  supabaseUsers,
  documents
}: AdminDashboardViewProps) => {
  return (
    <ModernAdminDashboard 
      users={users} 
      supabaseUsers={supabaseUsers} 
      documents={documents} 
    />
  );
};
