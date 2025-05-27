
import { StorageOverview } from "./dashboard/StorageOverview";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/document-management/useDocumentManagement";

export const StorageView = () => {
  const { users, supabaseUsers } = useUserManagement();
  const { documents } = useDocumentManagement(users, supabaseUsers);

  return (
    <StorageOverview 
      documents={documents} 
      users={supabaseUsers} 
    />
  );
};
