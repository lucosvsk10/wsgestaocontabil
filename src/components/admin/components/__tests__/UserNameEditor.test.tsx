
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { UserNameEditor } from '../UserNameEditor';
import { useUserProfileData } from '@/hooks/upload/useUserProfileData';

// Mock the useUserProfileData hook
vi.mock('@/hooks/upload/useUserProfileData', () => ({
  useUserProfileData: vi.fn(),
}));

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}));

// Mock the toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('UserNameEditor', () => {
  const mockUser = {
    id: '123',
    email: 'user@example.com',
    created_at: '2023-01-01',
    user_metadata: {
      name: 'Test User',
    },
  };
  
  const mockRefreshUsers = vi.fn();
  
  const mockHookImplementation = {
    isEditingUser: null,
    newName: 'Test User',
    setNewName: vi.fn(),
    nameError: null,
    getUserName: vi.fn().mockReturnValue('Test User'),
    handleEditName: vi.fn(),
    handleSaveName: vi.fn(),
    cancelEditing: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserProfileData as any).mockReturnValue(mockHookImplementation);
  });
  
  it('displays the user name and edit button', () => {
    render(<UserNameEditor authUser={mockUser} refreshUsers={mockRefreshUsers} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();  
    expect(screen.getByRole('button')).toBeInTheDocument();     
  });
  
  it('calls handleEditName when edit button is clicked', () => {
    render(<UserNameEditor authUser={mockUser} refreshUsers={mockRefreshUsers} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockHookImplementation.handleEditName).toHaveBeenCalledWith(mockUser);
  });
  
  it('shows the edit dialog when isEditingUser matches user id', () => {
    (useUserProfileData as any).mockReturnValue({
      ...mockHookImplementation,
      isEditingUser: '123', // Matches the mock user id
    });
    
    render(<UserNameEditor authUser={mockUser} refreshUsers={mockRefreshUsers} />);
    
    expect(screen.getByText('Editar Nome do Usuário')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  
  it('displays error message when name validation fails', () => {
    (useUserProfileData as any).mockReturnValue({
      ...mockHookImplementation,
      isEditingUser: '123',
      nameError: 'O nome deve ter pelo menos 3 caracteres.',
    });
    
    render(<UserNameEditor authUser={mockUser} refreshUsers={mockRefreshUsers} />);
    
    expect(screen.getByText('O nome deve ter pelo menos 3 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
  
  it('calls handleSaveName when save button is clicked', () => {
    (useUserProfileData as any).mockReturnValue({
      ...mockHookImplementation,
      isEditingUser: '123',
    });
    
    render(<UserNameEditor authUser={mockUser} refreshUsers={mockRefreshUsers} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mockHookImplementation.handleSaveName).toHaveBeenCalledWith('123');
  });
});
