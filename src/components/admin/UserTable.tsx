import { useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useUserProfileData } from "@/hooks/upload/useUserProfileData";
import type { UserTableProps } from "./types/userTable";
import { EditNameDialog } from "./components/EditNameDialog";
import { UserTableHeader } from "./tables/UserTableHeader";
import { UserRow } from "./tables/UserRow";
import { EmptyTableMessage } from "./tables/EmptyTableMessage";
import { useUserTable } from "./hooks/useUserTable";
export const UserTable = ({
  users,
  userInfoList,
  title,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  showDocumentButton = true,
  isAdminSection = false
}: UserTableProps) => {
  const {
    sortDirection,
    toggleSort,
    sortedUsers
  } = useUserTable(users);
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
  const getUserInfo = (authUserId: string) => {
    return userInfoList.find(u => u.id === authUserId) || null;
  };

  // Handle confirmation for user deletion
  const handleDeleteUser = () => {
    if (confirm('Deseja realmente excluir este usuário?')) {
      refreshUsers();
    }
  };
  return <div className="bg-navy-dark">
      <h3 className="text-xl mb-3 font-normal text-gray-400 my-[10px] py-[20px]">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <UserTableHeader isAdminSection={isAdminSection} sortDirection={sortDirection} toggleSort={toggleSort} />
          
          <TableBody className="text-navy dark:text-white">
            {sortedUsers.length > 0 ? sortedUsers.map(authUser => {
            const userInfo = getUserInfo(authUser.id);
            const displayName = getUserName(authUser);
            return <UserRow key={authUser.id} authUser={authUser} userInfo={userInfo} isAdminSection={isAdminSection} displayName={displayName} onEditName={() => handleEditName(authUser)} onChangePassword={() => {
              if (userInfo) {
                setSelectedUserForPasswordChange(userInfo);
                passwordForm.reset();
              }
            }} onDelete={handleDeleteUser} showDocumentButton={showDocumentButton} />;
          }) : <EmptyTableMessage title={title} colSpan={isAdminSection ? 2 : 4} />}
          </TableBody>
        </Table>
      </div>
      
      <EditNameDialog isOpen={!!isEditingUser} onClose={cancelEditing} name={newName} setName={setNewName} onSave={() => isEditingUser && handleSaveName(isEditingUser)} error={nameError} />
    </div>;
};