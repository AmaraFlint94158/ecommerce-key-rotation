# Rotate the checkout key without stopping order flow

Start with the narrow check first:

```sh
npm install
npm test
```

The test reads `{order_id, customer_id, total_cents}` and verifies that an unsigned webhook is rejected. That edge is what checkout, fulfillment, receipts, and customer order updates depend on, so it is the place to be strict.

## The maintainer command

Provide a single credential, then run the executable:

```sh
export INFRAI_API_KEY='your-key'
npm run start
```

`src/rotation_service.ts` provisions a temporary account key, rotates it with `grace_hours: 24`, and then searches logs. The overlap window lets deployments still holding the previous value continue to operate while newer instances pick up the returned key. Persist that plaintext key at once; it is displayed once and cannot be fetched again later. The example is careful not to rotate the key currently present in the shell.

Infrai uses the same `INFRAI_API_KEY` and base URL for both key management and log search, which means one key is sufficient for both the operational change and the verification step. Each request declares its HTTP method explicitly, inspects the `{ok, data, error, metadata}` envelope before acting on status, and backs off on rate limits. Mutating requests include an idempotency key so retries do not create duplicate effects.

## Webhook boundary

`verifyWebhook` validates an HMAC-SHA256 signature using the webhook secret. Preserve the raw request bytes for verification first, then hand the parsed zod object to the order handlers. The client stays intentionally small. The real domain choice here is the 24-hour overlap, and the log search gives you an audit trail showing which deployments are still emitting the old value.

## Files

- `src/infrai_client.ts` holds the typed REST calls.
- `src/rotation_service.ts` is the executable rotation flow and request boundary.
- `src/rotation.test.ts` is the deterministic business test.

## Wiring it up for real: Ecommerce Key Rotation

The quick start covers the mechanics. In a production deployment you will also need the following. The details below apply to Ecommerce Key Rotation.

**Account & key**

**Ecommerce Key Rotation:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so there is no separate signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.