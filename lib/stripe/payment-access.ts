import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function getAccessSecret() {
  const secret = process.env.PAYMENT_LINK_SECRET || process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error("PAYMENT_LINK_SECRET or CLERK_SECRET_KEY is required");
  }

  return secret;
}

export function createPaymentAccessToken(invoiceId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${invoiceId}.${expiresAt}`;
  const signature = createHmac("sha256", getAccessSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyPaymentAccessToken(invoiceId: string, token: string | null) {
  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== invoiceId) {
    return false;
  }

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getAccessSecret())
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64url");
  const provided = Buffer.from(parts[2]);
  const expected = Buffer.from(expectedSignature);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}