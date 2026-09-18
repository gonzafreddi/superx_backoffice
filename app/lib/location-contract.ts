import type { UserRole } from "./product-contract";

export type WarehouseLocation = { id: string; warehouseId: string; code: string; aisle: string; rack: string; level: string; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string };
export type LocationWarehouse = { id: string; name: string };
export type LocationProduct = { id: string; name: string };
export type ProductLocation = { productId: string; warehouseId: string; location: WarehouseLocation };
export type LocationInput = { code: string; aisle: string; rack: string; level: string; sortOrder?: number; isActive?: boolean };

export type LocationApi = {
  listWarehouses(): Promise<LocationWarehouse[]>;
  listLocations(warehouseId: string): Promise<WarehouseLocation[]>;
  createLocation(warehouseId: string, input: LocationInput): Promise<WarehouseLocation>;
  updateLocation(id: string, input: LocationInput): Promise<WarehouseLocation>;
  searchProducts(query: string): Promise<LocationProduct[]>;
  getProductLocation(warehouseId: string, productId: string): Promise<ProductLocation | null>;
  assignProductLocation(productId: string, warehouseId: string, locationId: string): Promise<ProductLocation>;
  clearProductLocation(productId: string, warehouseId: string): Promise<void>;
};

export type LocationPermissions = { manage: boolean };
export type LocationRole = UserRole;
