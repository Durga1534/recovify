import { createHmac, timingSafeEqual } from "node:crypto";

function getStateSecret() {
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is missing");
  }

  return secret;
}

export function createOAuthState(userId: string) {
  const signature = createHmac("sha256", getStateSecret())
    .update(userId)
    .digest("base64url");

  return `${userId}.${signature}`;
}

export function verifyOAuthState(state: string) {
  const separator = state.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const userId = state.slice(0, separator);
  const providedSignature = state.slice(separator + 1);
  const expectedSignature = createHmac("sha256", getStateSecret())
    .update(userId)
    .digest("base64url");

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  return userId;
}