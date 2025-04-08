
import { useState } from "react";
import { Trash2, ShieldCheck, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { MakeAdminDialog } from "./MakeAdminDialog";

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

  // For admin section, only show the ellipsis menu
  if (isAdminSection) {
    return (
      <Button 
        variant="ghost" 
        className="text-white hover:bg-[#46413d] hover:text-gold" 
        size="icon"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
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
