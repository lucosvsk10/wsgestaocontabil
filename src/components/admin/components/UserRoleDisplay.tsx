
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
  const formatRoleText = (role: string): string => {
    const roleMap: Record<string, string> = {
      'client': 'Cliente',
      'contabil': 'Contábil',
      'fiscal': 'Fiscal',
      'geral': 'Administrador'
    };
    return roleMap[role.toLowerCase()] || role;
  };

  return (
    <Badge className={`${getRoleClassName()}`}>
      {formatRoleText(getRoleText())}
    </Badge>
  );
};
