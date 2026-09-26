import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_IMAGE_MAX_BYTES, productImageError, validateProductImage } from "../app/lib/product-image-rules.js";

test("acepta JPEG, PNG y WebP de hasta 5 MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.equal(validateProductImage({ type, size: PRODUCT_IMAGE_MAX_BYTES }), "");
});

test("rechaza tipos no permitidos y archivos demasiado grandes", () => {
  assert.match(validateProductImage({ type: "image/gif", size: 20 }), /JPEG, PNG o WebP/);
  assert.match(validateProductImage({ type: "image/png", size: PRODUCT_IMAGE_MAX_BYTES + 1 }), /5 MB/);
});

test("mapea errores HTTP a mensajes claros", () => {
  assert.match(productImageError(400), /no es válida/);
  assert.match(productImageError(413), /5 MB/);
  assert.match(productImageError(403), /permiso/);
});
