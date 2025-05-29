
export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_type: 'all_users' | 'logged_users' | 'public_visitors' | 'specific_user';
  target_user_id?: string | null;
  theme: 'normal' | 'urgent';
  position: 'bottom_right' | 'top_fixed';
  action_button_text?: string | null;
  action_button_url?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
  created_by: string;
}

export interface AnnouncementView {
  id: string;
  announcement_id: string;
  user_id?: string | null;
  session_id?: string | null;
  viewed_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  target_type: 'all_users' | 'logged_users' | 'public_visitors' | 'specific_user';
  target_user_id?: string | null;
  theme: 'normal' | 'urgent';
  position: 'bottom_right' | 'top_fixed';
  action_button_text?: string | null;
  action_button_url?: string | null;
  is_active?: boolean;
  expires_at?: Date | null;
}
