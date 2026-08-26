export interface GalleryImage {
  id: number;
  gallery_tab_id: number;
  image_url: string;
  alt_text: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryTab {
  id: number;
  name: string;
  display_order: number;
  image_count: number;
  images?: GalleryImage[];
  created_at: string;
  updated_at: string;
}

export interface GalleryTabInput {
  name: string;
}

export interface GalleryImageInput {
  gallery_tab_id: number;
  alt_text: string;
  image?: File;
}
