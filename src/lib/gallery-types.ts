export type GalleryItem = {
  id: string;
  src: string;
  caption: string;
  alt: string;
  createdAt: string;
};

export type GalleryData = {
  items: GalleryItem[];
};
