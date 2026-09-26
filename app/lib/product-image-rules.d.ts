export const PRODUCT_IMAGE_MAX_BYTES: number;
export const PRODUCT_IMAGE_ACCEPT: string;
export function validateProductImage(file: Pick<File, "type" | "size">): string;
export function productImageError(status: number): string;
