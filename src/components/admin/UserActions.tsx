
import { useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { MakeAdminDialog } from "./MakeAdminDialog";

interface UserActionsProps {
  authUser: {
    id: string;
    email: string;
  };
  refreshUsers: () => void;
}

export const UserActions = ({ authUser, refreshUsers }: UserActionsProps) => {
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [makeAdminDialog, setMakeAdminDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="text-purple-500" 
          size="icon"
          onClick={() => setMakeAdminDialog(true)}
        >
          <ShieldCheck className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          className="text-red-500" 
          size="icon"
          onClick={() => setDeleteUserDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Make Admin Dialog */}
      <MakeAdminDialog 
        open={makeAdminDialog}
        onOpenChange={setMakeAdminDialog}
        authUser={authUser}
        onSuccess={refreshUsers}
      />

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
