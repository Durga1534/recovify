import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dunningSettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const companyName = String(formData.get("companyName") || "").trim();
  const brandColor = String(formData.get("brandColor") || "").trim();
  const emailSubjectStep1 = String(formData.get("emailSubjectStep1") || "").trim();

  if (!companyName || !/^#[0-9a-f]{6}$/i.test(brandColor) || !emailSubjectStep1) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  await db
    .insert(dunningSettings)
    .values({ userId: user.id, companyName, brandColor, emailSubjectStep1 })
    .onConflictDoUpdate({
      target: dunningSettings.userId,
      set: { companyName, brandColor, emailSubjectStep1, updatedAt: new Date() },
    });

  return NextResponse.redirect(new URL("/dashboard/template-settings?saved=1", request.url));
}