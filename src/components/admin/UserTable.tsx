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
  return <div>
      <h3 className="text-xl mb-3 font-normal text-[#6b7280] py-[10px]">{title}</h3>
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-[#e6e6e6]">
        <Table className="bg-navy-DEFAULT">
          <UserTableHeader isAdminSection={isAdminSection} sortDirection={sortDirection} toggleSort={toggleSort} />
          
          <TableBody className="text-[#020817]">
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