const LOCAL_APP_URL = "http://localhost:3000";

export function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const appUrl = configuredUrl || LOCAL_APP_URL;

  if (process.env.NODE_ENV === "production" && appUrl === LOCAL_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL must be set to the public production URL");
  }

  try {
    const parsedUrl = new URL(appUrl);

    if (!parsedUrl.protocol.startsWith("http")) {
      throw new Error("NEXT_PUBLIC_APP_URL must use http or https");
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "NEXT_PUBLIC_APP_URL is invalid"
    );
  }

  return appUrl;
}