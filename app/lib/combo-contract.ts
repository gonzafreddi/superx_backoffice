export type ComboItem = {
  id?: string;
  productId: string;
  quantity: number;
  product?: { id: string; name: string; slug?: string; sku?: string };
};

export type Combo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  comboPrice: string;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number;
  items: ComboItem[];
  createdAt: string;
  updatedAt: string;
};

export type ComboInput = {
  name: string;
  description?: string;
  comboPrice: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  sortOrder: number;
  items: Array<{ productId: number | string; quantity: number }>;
};

export type ComboApi = {
  listAdmin(): Promise<Combo[]>;
  create(input: ComboInput): Promise<Combo>;
  update(id: string, input: Partial<ComboInput>): Promise<Combo>;
  uploadImage(id: string, file: File): Promise<Combo>;
  deleteImage(id: string): Promise<Combo>;
};
