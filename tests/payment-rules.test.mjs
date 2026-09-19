import test from "node:test";
import assert from "node:assert/strict";
import { autoAllocate, validatePaymentAllocations } from "../app/lib/payment-rules.js";
const docs=[{id:"2",dueDate:"2026-10-10",balance:"10.10"},{id:"1",dueDate:"2026-09-20",balance:"5.05"}];
test("distribuye por vencimiento y conserva centavos",()=>{const result=autoAllocate("12.00",docs);assert.deepEqual(result.allocations.map(x=>[x.targetId,x.amount]),[["1","5.05"],["2","6.95"]]);assert.equal(result.remaining,"0.00")});
test("informa remanente como anticipo",()=>assert.equal(autoAllocate("20",docs).remaining,"4.85"));
test("bloquea exceso por documento y total",()=>{const result=validatePaymentAllocations("10",[{targetId:"1",amount:"11"}],docs);assert.ok(result.errors.length)});
