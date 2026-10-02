import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const checkoutRequest = z.object({
  order_id: z.string().min(1),
  customer_id: z.string().min(1),
  total_cents: z.number().int().positive()
});

export function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function rotateTemporaryKey() {
  const infrai = new InfraiClient();
  const created = await infrai.createKey({ name: "checkout-rotation-test", idempotency_key: `checkout-${Date.now()}` });
  const rotated = await infrai.rotateKey(created.id, { grace_hours: 24, idempotency_key: `rotate-${randomUUID()}` });
  const usage = await infrai.searchLogs();
  return { key: rotated.key, oldKeyUsage: usage };
}

if (process.argv[1]?.endsWith("rotation_service.ts")) {
  rotateTemporaryKey().then((result) => console.log(JSON.stringify({ rotated: true, result }))).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
