import assert from "node:assert/strict";
import { test } from "node:test";
import { createPaymentAccessToken, verifyPaymentAccessToken } from "../lib/stripe/payment-access";
import { getAppUrl } from "../lib/app-url";

process.env.PAYMENT_LINK_SECRET = "test-payment-link-secret";

test("payment access tokens validate for the intended invoice", () => {
  const invoiceId = "invoice-123";
  const token = createPaymentAccessToken(invoiceId);

  assert.equal(verifyPaymentAccessToken(invoiceId, token), true);
  assert.equal(verifyPaymentAccessToken("invoice-456", token), false);
  assert.equal(verifyPaymentAccessToken(invoiceId, `${token}tampered`), false);
});

test("production rejects the localhost application URL", () => {
  const environment = process.env as Record<string, string | undefined>;
  const previousNodeEnv = environment.NODE_ENV;
  const previousAppUrl = environment.NEXT_PUBLIC_APP_URL;

  environment.NODE_ENV = "production";
  environment.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  assert.throws(() => getAppUrl(), /NEXT_PUBLIC_APP_URL must be set/);

  environment.NODE_ENV = previousNodeEnv;
  environment.NEXT_PUBLIC_APP_URL = previousAppUrl;
});