
// Document view statuses
export type DocumentViewStatus = 'unread' | 'read' | 'acknowledged';

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}
