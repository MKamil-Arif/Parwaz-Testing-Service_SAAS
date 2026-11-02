import { PAYMENT_METHOD } from "@/lib/constants";

export type PaymentMode = "sandbox" | "live";

/** sandbox = local demo gateway; live = real gateways only (sandbox disabled). */
export function paymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "live" ? "live" : "sandbox";
}

export type MethodInfo = {
  method: string;
  label: string;
  description: string;
  kind: "redirect" | "manual";
  available: boolean;
  unavailableReason?: string;
};

/**
 * Integration point for real gateways. An adapter becomes available only when it is implemented
 * against the provider's merchant documentation, credentials are configured, and PAYMENT_MODE=live.
 * Confirmation must always arrive through the signed callback handled in callbacks.ts.
 */
type LiveGateway = { method: string; label: string; configured: () => boolean; implemented: boolean };

const LIVE_GATEWAYS: LiveGateway[] = [
  {
    method: PAYMENT_METHOD.JAZZCASH,
    label: "JazzCash online checkout",
    configured: () => !!(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_INTEGRITY_SALT),
    implemented: false,
  },
  {
    method: PAYMENT_METHOD.EASYPAISA,
    label: "Easypaisa online checkout",
    configured: () => !!(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY),
    implemented: false,
  },
];

export function paymentMethods(): MethodInfo[] {
  const mode = paymentMode();
  const methods: MethodInfo[] = [];

  methods.push({
    method: PAYMENT_METHOD.SANDBOX,
    label: "Online payment — Sandbox test mode",
    description: "A simulated checkout for development and demos. No real money moves; sandbox payments are excluded from revenue reports.",
    kind: "redirect",
    available: mode === "sandbox",
    unavailableReason: "Sandbox payments are disabled in live mode.",
  });

  for (const g of LIVE_GATEWAYS) {
    const available = mode === "live" && g.configured() && g.implemented;
    methods.push({
      method: g.method,
      label: g.label,
      description: "Pay securely online. Your registration is confirmed automatically once the gateway confirms the payment.",
      kind: "redirect",
      available,
      unavailableReason: "Coming soon — online gateway activation is pending merchant onboarding.",
    });
  }

  methods.push({
    method: PAYMENT_METHOD.MANUAL_TRANSFER,
    label: "JazzCash / Easypaisa / bank transfer",
    description: "Send the fee to our account and submit your transaction ID. Our team verifies it before confirming your registration.",
    kind: "manual",
    available: true,
  });

  return methods;
}

export function isMethodAvailable(method: string): boolean {
  return paymentMethods().some((m) => m.method === method && m.available);
}
