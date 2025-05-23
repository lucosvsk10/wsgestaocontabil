
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EditNameDialog } from "./EditNameDialog";
import { useUserProfileData } from "@/hooks/upload/useUserProfileData";
import { AuthUser } from "@/components/admin/types/userTable";

interface UserNameEditorProps {
  authUser: AuthUser;
  refreshUsers: () => void;
}

export const UserNameEditor = ({ authUser, refreshUsers }: UserNameEditorProps) => {
  const { 
    isEditingUser, 
    newName, 
    setNewName, 
    nameError,
    getUserName,
    handleEditName, 
    handleSaveName, 
    cancelEditing 
  } = useUserProfileData(refreshUsers);

  // Display either the user metadata name or database name
  const displayName = getUserName(authUser);

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-navy dark:text-white">{displayName}</span>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20"
          onClick={() => handleEditName(authUser)}
          aria-label={`Editar nome de ${displayName}`}
        >
          <Pencil size={14} />
        </Button>
      </div>

      <EditNameDialog 
        isOpen={isEditingUser === authUser.id}
        onClose={cancelEditing}
        name={newName}
        setName={setNewName}
        onSave={() => handleSaveName(authUser.id)}
        error={nameError}
      />
    </>
  );
};
