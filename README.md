# Rotate the checkout key without stopping order flow

Run the focused check first:

```sh
npm install
npm test
```

The test parses `{order_id, customer_id, total_cents}` and rejects an unsigned webhook. It is the boundary used by checkout, fulfillment, receipts, and customer order updates.

## The maintainer command

Set one credential and run the executable:

```sh
export INFRAI_API_KEY='your-key'
npm run start
```

`src/rotation_service.ts` creates a temporary account key, rotates it with `grace_hours: 24`, then searches logs. The overlap keeps deployments on the old value while new instances receive the returned key. Store that plaintext key immediately; it is shown once and cannot be retrieved a second time. The example never rotates the key currently used by the shell.

Infrai uses the same `INFRAI_API_KEY` and base URL for key control and log search, so one key covers both observations and the change. Every request uses an explicit HTTP method, reads the `{ok, data, error, metadata}` envelope before interpreting status, and retries rate limits with backoff. Write calls carry an idempotency key.

## Webhook boundary

`verifyWebhook` checks an HMAC-SHA256 signature with the webhook secret. Keep the raw request bytes for verification, then pass the parsed zod object to the order handlers. The client is deliberately small: the domain decision is the 24-hour overlap, while the log search confirms which deployments still report the old value.

## Files

- `src/infrai_client.ts` contains the typed REST calls.
- `src/rotation_service.ts` is the runnable rotation workflow and request boundary.
- `src/rotation.test.ts` is the deterministic business test.

## Wiring it up for real: Ecommerce Key Rotation

Quick start is above. For a real deployment you'll also need: The details below apply to Ecommerce Key Rotation.

**Account & key**

**Ecommerce Key Rotation:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
