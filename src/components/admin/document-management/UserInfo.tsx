
import React from "react";
import { User, Mail } from "lucide-react";

interface UserInfoProps {
  userName: string;
  userEmail: string;
}

export const UserInfo: React.FC<UserInfoProps> = ({ userName, userEmail }) => {
  return (
    <div className="p-4 bg-navy/5 dark:bg-gold/10 rounded-lg border border-navy/10 dark:border-gold/20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-navy-dark dark:text-gold" />
          <span className="font-bold text-lg text-navy-dark dark:text-gold">{userName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-navy-dark dark:text-gold" />
          <span className="text-sm text-gray-600 dark:text-gray-300">{userEmail}</span>
        </div>
      </div>
    </div>
  );
};
