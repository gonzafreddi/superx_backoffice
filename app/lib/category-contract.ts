export type CategoryImage = { id: string; url: string; altText: string | null; sortOrder: number; isPrimary: boolean };
export type ManagedCategory = { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; isActive: boolean; images: CategoryImage[]; imageUrl: string | null; productCount?: number };
export type CategoryCreateInput = { name: string; slug?: string; parentId?: string | null; sortOrder?: number };
export type CategoryUpdateInput = { name?: string; parentId?: string | null; sortOrder?: number; isActive?: boolean };
export type CategoryImagePatch = { altText?: string | null; isPrimary?: boolean; sortOrder?: number };
export type UploadProgress = (percent: number) => void;
export type CategoryApi = {
  list(): Promise<ManagedCategory[]>;
  get(id: string): Promise<ManagedCategory>;
  create(input: CategoryCreateInput): Promise<ManagedCategory>;
  update(id: string, input: CategoryUpdateInput): Promise<ManagedCategory>;
  uploadImage(id: string, file: File, altText?: string, onProgress?: UploadProgress): Promise<CategoryImage>;
  updateImage(categoryId: string, imageId: string, input: CategoryImagePatch): Promise<CategoryImage>;
  deleteImage(categoryId: string, imageId: string): Promise<void>;
  orderImages(categoryId: string, imageIds: string[]): Promise<void>;
};
