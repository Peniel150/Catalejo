import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mapStatus, verifyWebhookSignature } from "../lib/mercadopago.ts";

const secret = "clave-de-prueba";
const sign = (id: string, req: string, ts: string) => createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");

test("firma válida del webhook", () => {
  const ts = "1762480000";
  const sig = `ts=${ts},v1=${sign("12345", "req-1", ts)}`;
  assert.equal(verifyWebhookSignature({ signature: sig, requestId: "req-1", dataId: "12345", secret }), true);
});

test("firma alterada, otro id o sin cabecera: rechazado", () => {
  const ts = "1762480000";
  const good = sign("12345", "req-1", ts);
  assert.equal(verifyWebhookSignature({ signature: `ts=${ts},v1=${good}`, requestId: "req-1", dataId: "99999", secret }), false);
  assert.equal(verifyWebhookSignature({ signature: `ts=${ts},v1=${good.replace(/.$/, "0")}`, requestId: "req-1", dataId: "12345", secret }), false);
  assert.equal(verifyWebhookSignature({ signature: null, requestId: "req-1", dataId: "12345", secret }), false);
});

test("firma vieja se rechaza (repetición)", () => {
  const ts = "1762480000";
  const sig = `ts=${ts},v1=${sign("12345", "req-1", ts)}`;
  assert.equal(verifyWebhookSignature({ signature: sig, requestId: "req-1", dataId: "12345", secret, maxAgeSec: 600, now: (1762480000 + 3600) * 1000 }), false);
});

test("estados de suscripción", () => {
  assert.equal(mapStatus("authorized"), "active");
  assert.equal(mapStatus("cancelled"), "cancelled");
  assert.equal(mapStatus("pending"), "trialing");
});
