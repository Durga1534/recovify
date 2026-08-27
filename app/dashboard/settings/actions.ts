"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, dunningSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface SettingsFormState {
  companyName: string;
  supportEmail: string;
  enableWhatsApp: boolean;
  enableEmail: boolean;
  day0DelayHours: number;
  day3DelayHours: number;
  day7DelayHours: number;
}

export async function updateUserSettings(data: SettingsFormState) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch user by Clerk ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Upsert dunning and branding settings
  const [existingSettings] = await db
    .select()
    .from(dunningSettings)
    .where(eq(dunningSettings.userId, user.id))
    .limit(1);

  if (existingSettings) {
    await db
      .update(dunningSettings)
      .set({
        companyName: data.companyName,
        emailEnabled: data.enableEmail,
        whatsappEnabled: data.enableWhatsApp,
        updatedAt: new Date(),
      })
      .where(eq(dunningSettings.id, existingSettings.id));
  } else {
    await db.insert(dunningSettings).values({
      userId: user.id,
      companyName: data.companyName,
      emailEnabled: data.enableEmail,
      whatsappEnabled: data.enableWhatsApp,
    });
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return { success: true };
}