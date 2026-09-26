export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const acceptedTypes = new Set(PRODUCT_IMAGE_ACCEPT.split(","));

export function validateProductImage(file) {
  if (!acceptedTypes.has(file.type)) return "El archivo debe ser JPEG, PNG o WebP.";
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return "El archivo supera el máximo de 5 MB.";
  return "";
}

export function productImageError(status) {
  if (status === 403) return "No tenés permiso para administrar fotos. Iniciá sesión con una cuenta de administración.";
  if (status === 413) return "La foto supera el máximo permitido de 5 MB.";
  if (status === 400) return "La foto no es válida. Usá un archivo JPEG, PNG o WebP de hasta 5 MB.";
  return "No pudimos completar la operación. Intentá nuevamente.";
}
