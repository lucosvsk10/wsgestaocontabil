
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
      <div className="flex flex-col w-full gap-2">
        <Button 
          variant="outline" 
          className="text-purple-500 cursor-pointer w-full justify-start"
          onClick={() => setMakeAdminDialog(true)}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          <span>Tornar ADM</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="text-red-500 cursor-pointer w-full justify-start"
          onClick={() => setDeleteUserDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Excluir Usuário</span>
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
