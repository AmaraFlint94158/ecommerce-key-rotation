import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { checkoutRequest, verifyWebhook } from "./rotation_service.js";

const parsed = checkoutRequest.parse({ order_id: "ord-42", customer_id: "cus-7", total_cents: 1299 });
assert.equal(parsed.total_cents, 1299);
const signature = createHmac("sha256", "secret").update("order shipped").digest("hex");
assert.equal(verifyWebhook("order shipped", signature, "secret"), true);
assert.equal(verifyWebhook("order shipped", "bad-signature", "secret"), false);
console.log("checkout input is accepted and unsigned webhook payloads are rejected");
