import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryTree, CATEGORY_IMAGE_MAX_BYTES, reorderCategoryImages, validateCategoryImage } from "../app/lib/category-rules.js";

test("validateCategoryImage accepts supported files up to 5 MB", () => {
  assert.equal(validateCategoryImage({ type: "image/webp", size: CATEGORY_IMAGE_MAX_BYTES }), "");
  assert.match(validateCategoryImage({ type: "image/gif", size: 10 }), /JPG, PNG o WebP/);
  assert.match(validateCategoryImage({ type: "image/jpeg", size: CATEGORY_IMAGE_MAX_BYTES + 1 }), /5 MB/);
});

test("buildCategoryTree orders parents and indents descendants", () => {
  const result = buildCategoryTree([
    { id: 3, name: "Té", parentId: 1, sortOrder: 0 },
    { id: 2, name: "Almacén", parentId: null, sortOrder: 2 },
    { id: 1, name: "Bebidas", parentId: null, sortOrder: 1 },
    { id: 4, name: "Café", parentId: 1, sortOrder: 0 },
  ]);
  assert.deepEqual(result.map(({ id, depth }) => [id, depth]), [[1, 0], [4, 1], [3, 1], [2, 0]]);
});

test("buildCategoryTree keeps orphaned and cyclic categories visible", () => {
  const result = buildCategoryTree([{ id: "a", name: "A", parentId: "b" }, { id: "b", name: "B", parentId: "a" }, { id: "c", name: "C", parentId: "missing" }]);
  assert.deepEqual(new Set(result.map((item) => item.id)), new Set(["a", "b", "c"]));
});

test("reorderCategoryImages moves and reindexes without mutating input", () => {
  const images = [{ id: "1", sortOrder: 0 }, { id: "2", sortOrder: 1 }, { id: "3", sortOrder: 2 }];
  const result = reorderCategoryImages(images, 2, 0);
  assert.deepEqual(result.map(({ id, sortOrder }) => [id, sortOrder]), [["3", 0], ["1", 1], ["2", 2]]);
  assert.deepEqual(images.map((image) => image.id), ["1", "2", "3"]);
});
