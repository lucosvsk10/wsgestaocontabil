
export interface CarouselItem {
  id: string;
  name: string;
  logo_url: string;
  instagram?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StorageLogo {
  name: string;
  url: string;
  size: number;
  lastModified: string;
}
