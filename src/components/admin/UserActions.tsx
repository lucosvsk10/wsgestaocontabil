
import { useState } from "react";
import { Trash2, ShieldCheck, MoreVertical, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { MakeAdminDialog } from "./MakeAdminDialog";
import { ChangeRoleDialog } from "./ChangeRoleDialog";

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
  const [makeAdminDialog, setMakeAdminDialog] = useState(false);
  const [changeRoleDialog, setChangeRoleDialog] = useState(false);

  // For admin section, show the role change option
  if (isAdminSection) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="text-[#e9aa91] border-gold/20 hover:bg-gold hover:text-navy" 
          size="icon"
          onClick={() => setChangeRoleDialog(true)}
          title="Alterar função"
        >
          <UserCog className="h-4 w-4" />
        </Button>

        {/* Change Role Dialog */}
        <ChangeRoleDialog 
          open={changeRoleDialog}
          onOpenChange={setChangeRoleDialog}
          authUser={authUser}
          onSuccess={refreshUsers}
        />
      </div>
    );
  }

  // For regular users section, show the normal actions
  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="text-purple-400 border-gold/20 hover:bg-gold hover:text-navy" 
          size="icon"
          onClick={() => setMakeAdminDialog(true)}
        >
          <ShieldCheck className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          className="text-red-500 border-gold/20 hover:bg-gold hover:text-navy" 
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
