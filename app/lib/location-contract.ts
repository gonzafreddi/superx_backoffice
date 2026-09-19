import type { UserRole } from "./product-contract";

export type LocationStatus = "ACTIVE" | "BLOCKED" | "INACTIVE";
export type LocationProduct = { id: string; name: string; slug?: string; sku?: string; barcode?: string; availableStock?: number };
export type WarehouseLocation = { id: string; warehouseId: string; code: string; aisle: string; rack: string; level: string; sortOrder: number; isActive: boolean; status: LocationStatus; capacity: number | null; capacityUnit: string | null; createdAt: string; updatedAt: string };
export type LocationListStock = { productCount: number; totalQuantity: number; reservedQuantity: number; availableQuantity: number; occupancyPercentage: number | null; primaryProduct: Pick<LocationProduct, "id" | "name" | "slug"> | null };
/** A location as returned by the list endpoint — includes what's currently stored there. */
export type WarehouseLocationWithProducts = WarehouseLocation & { products: LocationProduct[]; stock: LocationListStock };
export type WarehouseStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type LocationWarehouse = { id: string; name: string; status: WarehouseStatus; cityId?: string; city?: { id?: string; name?: string } | null; isPrimary?: boolean; isActive?: boolean };
export type WarehouseStats = { warehouseId: string; locationsCount: number; racksCount: number; productsCount: number; totalQuantity: number; totalCapacity: number; occupancyPercentage: number | null; locationsFullCount: number; locationsEmptyCount: number; lastUpdatedAt: string | null };
export type WarehouseInput = { cityId?: string; name: string; isPrimary?: boolean; status?: WarehouseStatus };
export type LocationCity = { id: string; name: string };
export type ProductLocation = { productId: string; warehouseId: string; location: WarehouseLocation };
export type LocationInput = { code: string; aisle: string; rack: string; level: string; sortOrder?: number; isActive?: boolean; status?: LocationStatus; capacity?: number | null; capacityUnit?: string | null };
export type LocationStats = { productsCount: number; totalQuantity: number; reservedQuantity: number; availableQuantity: number; capacity: number | null; capacityUnit: string | null; occupancyPercentage: number | null };
export type LocationDetailData = { location: WarehouseLocation; stats: LocationStats };
export type LocationStockItem = { product: LocationProduct; quantity: number; reservedQuantity: number; availableQuantity: number };
export type WarehouseStockItem = { product: LocationProduct; location: Pick<WarehouseLocation, "id" | "code" | "aisle" | "rack" | "level">; quantity: number; reservedQuantity: number; availableQuantity: number };
export type LocationMovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
export type LocationStockMovement = { id: string; type: LocationMovementType; productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; reference: string | null; reason?: LocationAdjustmentReason | null; notes: string | null; actorUserId: string | null; createdAt: string };
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
export type LocationAdjustmentReason = "PHYSICAL_COUNT" | "BREAKAGE" | "LOSS" | "LOAD_ERROR" | "RETURN" | "OTHER";

export type LocationApi = {
  listWarehouses(): Promise<LocationWarehouse[]>;
  listWarehouseStats(ids?: string[]): Promise<WarehouseStats[]>;
  getWarehouseStats(id: string): Promise<WarehouseStats>;
  createWarehouse(input: WarehouseInput): Promise<LocationWarehouse>;
  updateWarehouse(id: string, input: WarehouseInput): Promise<LocationWarehouse>;
  listCities(): Promise<LocationCity[]>;
  listLocations(warehouseId: string): Promise<WarehouseLocationWithProducts[]>;
  createLocation(warehouseId: string, input: LocationInput): Promise<WarehouseLocation>;
  updateLocation(id: string, input: LocationInput): Promise<WarehouseLocation>;
  searchProducts(query: string): Promise<LocationProduct[]>;
  getProductLocation(warehouseId: string, productId: string): Promise<ProductLocation | null>;
  assignProductLocation(productId: string, warehouseId: string, locationId: string): Promise<ProductLocation>;
  clearProductLocation(productId: string, warehouseId: string): Promise<void>;
  getLocation(warehouseId: string, locationId: string): Promise<LocationDetailData>;
  getLocationStock(warehouseId: string, locationId: string, query?: string, page?: number, pageSize?: number): Promise<Paginated<LocationStockItem>>;
  getWarehouseStock(warehouseId: string, query?: string, page?: number, pageSize?: number): Promise<Paginated<WarehouseStockItem>>;
  getLocationMovements(warehouseId: string, locationId: string, filters?: Record<string, string | number | undefined>): Promise<Paginated<LocationStockMovement>>;
  addLocationStock(warehouseId: string, locationId: string, input: { productId: string; quantity: number; reference?: string; notes?: string }): Promise<LocationStockItem>;
  transferLocationStock(warehouseId: string, locationId: string, input: { productId: string; quantity: number; toLocationId: string; reference?: string; notes?: string }): Promise<unknown>;
  adjustLocationStock(warehouseId: string, locationId: string, input: { productId: string; mode: "set" | "delta"; quantity: number; reason: LocationAdjustmentReason; reference?: string; notes?: string }): Promise<LocationStockItem>;
  removeLocationStock(warehouseId: string, locationId: string, productId: string): Promise<void>;
};

export type LocationPermissions = { manage: boolean; createWarehouse: boolean };
export type LocationRole = UserRole;
