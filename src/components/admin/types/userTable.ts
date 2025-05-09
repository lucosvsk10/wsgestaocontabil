

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
  setSelectedUserId?: (id: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: any;
  refreshUsers: () => void;
  showDocumentButton?: boolean;
  isAdminSection?: boolean;
}

