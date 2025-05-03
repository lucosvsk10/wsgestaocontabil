
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteUserDialog } from "./DeleteUserDialog";

interface UserActionsProps {
  authUser: {
    id: string;
    email: string;
  };
  refreshUsers: () => void;
  isAdminSection?: boolean;
}

export const UserActions = ({ authUser, refreshUsers, isAdminSection = false }: UserActionsProps) => {
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);

  // For regular users section, show only the delete action
  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="text-red-500 border-gold/20 hover:bg-gold hover:text-navy" 
          size="icon"
          onClick={() => setDeleteUserDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete User Dialog */}
      <DeleteUserDialog 
        open={deleteUserDialog}
        onOpenChange={setDeleteUserDialog}
        authUser={authUser}
        onSuccess={refreshUsers}
      />
    </>
  );
};
