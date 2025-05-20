
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { UserType } from "@/types/admin";

interface ClientSelectorProps {
  users: any[];
  supabaseUsers: any[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  users,
  supabaseUsers,
  selectedUserId,
  onSelectUser
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  
  // Combine supabase users with user profiles
  useEffect(() => {
    const mergedUsers = supabaseUsers.map(authUser => {
      const userProfile = users.find(u => u.id === authUser.id);
      return {
        ...authUser,
        profile: userProfile
      };
    });
    
    // Filter users based on search query
    let filtered = [...mergedUsers];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.user_metadata?.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query) ||
        (user.profile?.name || "").toLowerCase().includes(query)
      );
    }
    
    setFilteredUsers(filtered);
  }, [users, supabaseUsers, searchQuery]);

  return (
    <div className="space-y-3 border border-gray-200 dark:border-navy-light/20 rounded-lg overflow-hidden">
      <div className="relative bg-white dark:bg-navy-deeper p-2">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-9 border-gray-200 dark:border-navy-light/30"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      
      <ScrollArea className="h-[400px] px-1">
        <div className="space-y-1 p-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => {
              const userName = user.user_metadata?.name || user.profile?.name || "Usuário sem nome";
              const userEmail = user.email || "Sem email";
              const isSelected = selectedUserId === user.id;
              
              return (
                <button
                  key={user.id}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    isSelected 
                      ? "bg-navy text-white dark:bg-gold dark:text-navy" 
                      : "hover:bg-gray-100 dark:hover:bg-navy-light/20"
                  }`}
                  onClick={() => onSelectUser(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isSelected ? "bg-white text-navy dark:bg-navy dark:text-gold" : "bg-gray-200 dark:bg-navy-light text-gray-700 dark:text-gray-300"
                    }`}>
                      <User size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium truncate">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
