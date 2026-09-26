export type TaxType = "VAT" | "PERCEPTION" | "INTERNAL" | "OTHER";
export type Tax = { id: string; name: string; type: TaxType; rate: number; includeInCost: boolean; isDefault: boolean; isActive: boolean; createdAt: string; updatedAt: string };
export type TaxInput = { name: string; type: TaxType; rate: number; includeInCost: boolean; isDefault: boolean };
export type TaxPatch = Partial<TaxInput> & { isActive?: boolean };
export type TaxApi = { list(active?: boolean): Promise<Tax[]>; create(input: TaxInput): Promise<Tax>; update(id: string, input: TaxPatch): Promise<Tax> };
