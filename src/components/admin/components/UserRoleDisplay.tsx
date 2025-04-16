
import { Badge } from "@/components/ui/badge";

interface UserRoleDisplayProps {
  authUser: {
    id: string;
    email: string;
  };
  getRoleText: (authUser: any) => string;
  getRoleClassName: (authUser: any) => string;
}

export const UserRoleDisplay = ({ 
  authUser, 
  getRoleText, 
  getRoleClassName 
}: UserRoleDisplayProps) => {
  return (
    <Badge className={`${getRoleClassName(authUser)}`}>
      {getRoleText(authUser)}
    </Badge>
  );
};
