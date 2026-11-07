import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, canAdd, planOf } from "../lib/plans.ts";

test("anual = 10 meses (2 gratis)", () => {
  for (const p of [PLANS.basic, PLANS.advanced]) assert.equal(p.yearly, p.monthly * 10);
});

test("plan efectivo según el estado de la suscripción", () => {
  assert.equal(planOf(null), "free");
  assert.equal(planOf({ plan: "basic", status: "active" }), "basic");
  assert.equal(planOf({ plan: "advanced", status: "past_due" }), "free");
  const future = new Date(Date.now() + 5 * 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(planOf({ plan: "advanced", status: "cancelled", current_period_end: future }), "advanced", "cancelada sigue hasta fin de período");
  assert.equal(planOf({ plan: "advanced", status: "cancelled", current_period_end: past }), "free");
});

test("límites", () => {
  assert.equal(canAdd(PLANS.free.limits.follows, 2), true);
  assert.equal(canAdd(PLANS.free.limits.follows, 3), false);
  assert.equal(canAdd(PLANS.advanced.limits.follows, 10_000), true);
});
