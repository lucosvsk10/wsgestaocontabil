
import { Badge } from "@/components/ui/badge";

interface UserRoleDisplayProps {
  authUser: {
    id: string;
    email: string;
  };
  getRoleText: () => string;
  getRoleClassName: () => string;
}

export const UserRoleDisplay = ({ 
  getRoleText, 
  getRoleClassName 
}: UserRoleDisplayProps) => {
  return (
    <Badge className={`${getRoleClassName()}`}>
      {getRoleText()}
    </Badge>
  );
};
