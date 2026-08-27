import crypto from "crypto";

export function verifyTwilioSignature ({
    url,
    params,
    signature,
    authToken,
}: {
    url: string;
    params: Record<string, string>;
    signature: string;
    authToken: string;
}): boolean {
    if (!signature || !authToken) return false;

    // Sort keys alphabetically to build standard Twilio signature string
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
}