
import { AuthUser } from "../types/userTable";

export const getRoleText = (authUser: AuthUser, userInfoList: any[], specialEmail?: string, specialRoleLabel?: string) => {
  const userInfo = userInfoList.find(u => u.id === authUser.id);
  if (!userInfo) return "Cliente";
  
  if (specialEmail && authUser.email === specialEmail) {
    return specialRoleLabel || "Geral";
  }
  
  switch (userInfo.role) {
    case 'fiscal': return "Fiscal";
    case 'contabil': return "Contábil";
    case 'geral': return "Geral";
    case 'client': return "Cliente";
    default: return "Cliente";
  }
};

export const getRoleClassName = (authUser: AuthUser, userInfoList: any[], specialEmail?: string, specialRoleClassName?: string) => {
  const userInfo = userInfoList.find(u => u.id === authUser.id);
  if (!userInfo) return "bg-blue-900 text-blue-100";
  
  if (specialEmail && authUser.email === specialEmail) {
    return specialRoleClassName || "bg-[#e8cc81] text-navy";
  }
  
  switch (userInfo.role) {
    case 'fiscal': return "bg-green-800 text-green-100";
    case 'contabil': return "bg-indigo-800 text-indigo-100";
    case 'geral': return "bg-[#e8cc81] text-navy";
    case 'client': return "bg-blue-900 text-blue-100";
    default: return "bg-blue-900 text-blue-100";
  }
};
