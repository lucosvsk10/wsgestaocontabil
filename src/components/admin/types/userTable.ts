
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

export interface UserTableProps {
  users: AuthUser[];
  userInfoList: any[];
  title: string;
  roleLabel: string;
  roleClassName: string;
  setSelectedUserId?: (id: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: any;
  refreshUsers: () => void;
  showDocumentButton?: boolean;
  specialEmail?: string;
  specialRoleLabel?: string;
  specialRoleClassName?: string;
  isAdminSection?: boolean;
}

export interface UserNameEditorProps {
  authUser: AuthUser;
  getUserName: (authUser: AuthUser) => string;
  handleEditName: (authUser: AuthUser) => void;
}
