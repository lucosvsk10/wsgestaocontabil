
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  // Combine user data
  const combinedUsers = supabaseUsers.map(supabaseUser => {
    const userProfile = users.find(u => u.id === supabaseUser.id);
    
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || userProfile?.name || 'Usuário sem nome',
      email: supabaseUser.email || userProfile?.email || 'Sem email'
    };
  });

  return (
    <div className="w-full md:w-72">
      <Label htmlFor="user-select" className="text-navy dark:text-gold mb-1 block font-medium">
        Selecione um cliente
      </Label>
      <Select
        value={selectedUserId || ''}
        onValueChange={onSelectUser}
      >
        <SelectTrigger 
          id="user-select" 
          className="w-full bg-white dark:bg-navy-light/50 border-gray-300 dark:border-navy-lighter/50 focus:ring-2 focus:ring-gold/50"
        >
          <SelectValue placeholder="Selecione um cliente" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-navy-deeper border-gray-200 dark:border-navy-lighter/50">
          {combinedUsers.map(user => (
            <SelectItem key={user.id} value={user.id} className="focus:bg-gray-100 dark:focus:bg-navy-light/50">
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
