import test from "node:test";
import assert from "node:assert/strict";
import { canCompleteTask, clampPickQuantity, nextPendingIndex, pendingLines, pickingProgress, sequenceItems } from "../app/lib/picking-rules.js";

const item = (id, status, sort, code = "A", required = 2) => ({ id, status, locationSortOrder: sort, locationCode: code, quantityRequired: required, quantityPicked: status === "PICKED" ? required : 0 });

test("sequenceItems ordena por ubicación, luego código, luego id", () => {
  const task = { items: [item("3", "PENDING", 40, "B"), item("1", "PENDING", 10, "A"), item("2", "PENDING", 10, "A2")] };
  assert.deepEqual(sequenceItems(task).map((i) => i.id), ["1", "2", "3"]);
});

test("pickingProgress y pendingLines cuentan sólo líneas sin resolver", () => {
  const task = { items: [item("1", "PICKED", 1), item("2", "PENDING", 2), item("3", "SHORT", 3)] };
  assert.deepEqual(pickingProgress(task), { resolved: 2, total: 3, percent: 67 });
  assert.deepEqual(pendingLines(task).map((i) => i.id), ["2"]);
});

test("canCompleteTask exige IN_PROGRESS y cero pendientes", () => {
  assert.equal(canCompleteTask({ status: "IN_PROGRESS", items: [item("1", "PICKED", 1)] }), true);
  assert.equal(canCompleteTask({ status: "IN_PROGRESS", items: [item("1", "PENDING", 1)] }), false);
  assert.equal(canCompleteTask({ status: "ASSIGNED", items: [item("1", "PICKED", 1)] }), false);
  assert.equal(canCompleteTask({ status: "IN_PROGRESS", items: [] }), false);
});

test("nextPendingIndex avanza y envuelve, -1 si no hay pendientes", () => {
  const items = [item("1", "PICKED", 1), item("2", "PENDING", 2), item("3", "PENDING", 3)];
  assert.equal(nextPendingIndex(items, 0), 1);
  assert.equal(nextPendingIndex(items, 1), 2);
  assert.equal(nextPendingIndex(items, 2), 1); // wraps past the picked line 0
  assert.equal(nextPendingIndex([item("1", "PICKED", 1)], 0), -1);
});

test("clampPickQuantity limita a [0, requerido] y descarta basura", () => {
  const line = { quantityRequired: 3 };
  assert.equal(clampPickQuantity(line, 5), 3);
  assert.equal(clampPickQuantity(line, -2), 0);
  assert.equal(clampPickQuantity(line, "abc"), 0);
  assert.equal(clampPickQuantity(line, 2), 2);
});

test("franja usa fecha local y ordenamiento es estable sin mutar entrada", async () => {
  const { pickingSlotLabel, sortPickingTasks } = await import("../app/lib/picking-rules.js");
  const tasks = [
    { id: "10", delivery: { slotDate: "2026-10-03", slotStart: "17:00:00", slotEnd: "20:00:00" }, items: [1] },
    { id: "2", slotDate: "2026-10-04", slotStart: "10:00", items: [1, 2] },
  ];
  assert.equal(pickingSlotLabel(tasks[0]), "sáb 3 oct · 17:00–20:00");
  assert.equal(pickingSlotLabel({}), "Horario sin confirmar");
  assert.deepEqual(sortPickingTasks(tasks).map((t) => t.id), ["10", "2"]);
  assert.deepEqual(sortPickingTasks(tasks, "oldest").map((t) => t.id), ["2", "10"]);
  assert.deepEqual(sortPickingTasks(tasks, "lines").map((t) => t.id), ["2", "10"]);
  assert.deepEqual(tasks.map((t) => t.id), ["10", "2"]);
});
