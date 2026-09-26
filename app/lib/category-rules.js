export const CATEGORY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CATEGORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateCategoryImage(file) {
  if (!file || !CATEGORY_IMAGE_TYPES.includes(file.type)) {
    return "El archivo debe ser una imagen JPG, PNG o WebP.";
  }
  if (file.size > CATEGORY_IMAGE_MAX_BYTES) {
    return "La imagen no puede superar los 5 MB.";
  }
  return "";
}

export function buildCategoryTree(categories) {
  const byParent = new Map();
  const ids = new Set(categories.map((category) => String(category.id)));
  for (const category of categories) {
    const parentId = category.parentId == null ? null : String(category.parentId);
    const key = parentId && ids.has(parentId) && parentId !== String(category.id) ? parentId : null;
    const siblings = byParent.get(key) ?? [];
    siblings.push(category);
    byParent.set(key, siblings);
  }
  const compare = (left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0) || String(left.name).localeCompare(String(right.name), "es-AR");
  for (const siblings of byParent.values()) siblings.sort(compare);
  const result = [];
  const visited = new Set();
  const visit = (category, depth) => {
    const id = String(category.id);
    if (visited.has(id)) return;
    visited.add(id);
    result.push({ ...category, depth });
    for (const child of byParent.get(id) ?? []) visit(child, depth + 1);
  };
  for (const root of byParent.get(null) ?? []) visit(root, 0);
  for (const category of categories) visit(category, 0);
  return result;
}

export function reorderCategoryImages(images, fromIndex, toIndex) {
  if (!Array.isArray(images) || fromIndex < 0 || fromIndex >= images.length || toIndex < 0 || toIndex >= images.length || fromIndex === toIndex) return [...(images ?? [])];
  const result = [...images];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result.map((image, index) => ({ ...image, sortOrder: index }));
}
