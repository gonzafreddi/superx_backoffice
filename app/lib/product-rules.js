export const ROLE_PERMISSIONS = {
  viewer: { create: false, update: false, delete: false, changeStatus: false },
  operator: { create: true, update: true, delete: false, changeStatus: true },
  admin: { create: true, update: true, delete: true, changeStatus: true },
};

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
}

export function validateProduct(input, products, currentId) {
  void products;
  void currentId;
  const errors = {};
  if (!input.name?.trim()) errors.name = "Ingresá el nombre comercial del producto.";
  if (!input.categoryId) errors.categoryId = "Seleccioná una categoría.";
  if (!input.brandId) errors.brandId = "Seleccioná una marca.";
  if (!input.unit) errors.unit = "Seleccioná una unidad de venta.";
  if (input.imageUrl && !/^https?:\/\//.test(input.imageUrl)) errors.imageUrl = "Usá una URL válida que comience con http:// o https://.";
  return errors;
}
