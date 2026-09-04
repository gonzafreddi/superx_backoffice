export const ROLE_PERMISSIONS = {
  viewer: { create: false, update: false, delete: false, changeStatus: false },
  operator: { create: true, update: true, delete: false, changeStatus: true },
  admin: { create: true, update: true, delete: true, changeStatus: true },
};

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
}

export function validateProduct(input, products, currentId) {
  const errors = {};
  if (!input.name?.trim()) errors.name = "Ingresá el nombre comercial del producto.";
  if (!input.categoryId) errors.categoryId = "Seleccioná una categoría.";
  if (!input.brandId) errors.brandId = "Seleccioná una marca.";
  if (!input.barcode?.trim()) errors.barcode = "Ingresá el código de barras.";
  else if (!/^\d{8,14}$/.test(input.barcode.trim())) errors.barcode = "El barcode debe contener entre 8 y 14 dígitos.";
  else if (products.some((product) => product.barcode === input.barcode.trim() && product.id !== currentId)) errors.barcode = "Ya existe un producto con este código de barras.";
  if (!input.unit) errors.unit = "Seleccioná una unidad de venta.";
  if (input.imageUrl && !/^https?:\/\//.test(input.imageUrl)) errors.imageUrl = "Usá una URL válida que comience con http:// o https://.";
  return errors;
}
