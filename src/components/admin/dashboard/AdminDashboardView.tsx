
import { AdminDashboard } from "./AdminDashboard";

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
    <AdminDashboard 
      users={users} 
      supabaseUsers={supabaseUsers} 
      documents={documents} 
    />
  );
};
