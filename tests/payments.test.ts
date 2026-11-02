import { beforeEach, describe, expect, it, vi } from "vitest";

// The callback handler is tested against an in-memory fake of the two tables it touches.
const store = vi.hoisted(() => ({
  payment: null as null | Record<string, unknown>,
  events: [] as Record<string, unknown>[],
  succeeded: [] as number[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    payment: { findUnique: vi.fn(async () => store.payment) },
    paymentEvent: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => store.events.push(data)) },
  },
}));
vi.mock("@/lib/payments/service", () => ({
  markPaymentSucceeded: vi.fn(async (id: number) => {
    store.succeeded.push(id);
    return true;
  }),
  markPaymentFailed: vi.fn(async () => true),
}));

import { processGatewayCallback, signCallback } from "@/lib/payments/callbacks";

const SECRET = "test-secret";
const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ reference: "PAY-TEST000001", status: "SUCCEEDED", amount: "500", gatewayTransactionId: "SBX-1", timestamp: Date.now(), ...over });

beforeEach(() => {
  process.env.SANDBOX_WEBHOOK_SECRET = SECRET;
  process.env.PAYMENT_MODE = "sandbox";
  store.payment = { id: 7, reference: "PAY-TEST000001", amount: { toString: () => "500" }, method: "SANDBOX", isSandbox: true, status: "INITIATED" };
  store.events = [];
  store.succeeded = [];
});

describe("processGatewayCallback", () => {
  it("rejects a missing or forged signature and records the attempt", async () => {
    const raw = body();
    expect((await processGatewayCallback("sandbox", raw, null)).status).toBe(401);
    expect((await processGatewayCallback("sandbox", raw, signCallback("wrong-secret", raw))).status).toBe(401);
    expect(store.succeeded).toEqual([]);
    expect(store.events.every((e) => e.signatureValid === false)).toBe(true);
  });

  it("rejects a tampered amount even with a valid signature", async () => {
    const raw = body({ amount: "5" });
    const res = await processGatewayCallback("sandbox", raw, signCallback(SECRET, raw));
    expect(res.status).toBe(400);
    expect(store.succeeded).toEqual([]);
  });

  it("rejects stale callbacks (replay protection)", async () => {
    const raw = body({ timestamp: Date.now() - 60 * 60 * 1000 });
    expect((await processGatewayCallback("sandbox", raw, signCallback(SECRET, raw))).status).toBe(400);
  });

  it("rejects sandbox callbacks in live mode", async () => {
    process.env.PAYMENT_MODE = "live";
    const raw = body();
    expect((await processGatewayCallback("sandbox", raw, signCallback(SECRET, raw))).status).toBe(403);
  });

  it("marks the payment paid only for a valid, fresh, correctly-signed callback", async () => {
    const raw = body();
    const res = await processGatewayCallback("sandbox", raw, signCallback(SECRET, raw));
    expect(res.status).toBe(200);
    expect(store.succeeded).toEqual([7]);
  });

  it("returns 404 for unknown providers", async () => {
    expect((await processGatewayCallback("unknown", body(), "x")).status).toBe(404);
  });
});
