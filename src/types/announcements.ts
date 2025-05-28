
export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_type: 'all_users' | 'logged_users' | 'public_visitors' | 'specific_user';
  target_user_id?: string;
  theme: 'normal' | 'urgent';
  position: 'bottom_right' | 'top_fixed';
  action_button_text?: string;
  action_button_url?: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export interface AnnouncementView {
  id: string;
  announcement_id: string;
  user_id?: string;
  session_id?: string;
  viewed_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  target_type: 'all_users' | 'logged_users' | 'public_visitors' | 'specific_user';
  target_user_id?: string;
  theme: 'normal' | 'urgent';
  position: 'bottom_right' | 'top_fixed';
  action_button_text?: string;
  action_button_url?: string;
  expires_at?: Date;
}
