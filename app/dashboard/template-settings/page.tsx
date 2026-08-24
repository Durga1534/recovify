import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, dunningSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Palette, Mail, Save } from "lucide-react";

export const revalidate = 0;

export default async function TemplateSettingsPage() {
    const { userId: clerkId } = await auth();

    if(!clerkId) {
        redirect("/sign-in");
    }

    const [ user ] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
        redirect("/dashboard");
    }

      let [ settings ] = await db
        .select()
        .from(dunningSettings)
        .where(eq(dunningSettings.userId, user.id))
        .limit(1);

        // Auto-initialize default settings if missing
        if(!settings) {
            const [ newSettings ] = await db
              .insert(dunningSettings)
              .values({userId: user.id})
              .returning();
            settings = newSettings;  
        }

        return (
            <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
                <div className="max-w-3xl mx-auto space-y-8">

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Email & Branding Settings</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Customize the look and copy of dunning emails sent to your customers when payments fail.
                        </p>
                    </div>

                    <form action="/api/dunning/settings" method="POST" className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">

                    {/* Brand Identity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-600" />
                            Brand Identity
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                                <input
                                  type="text"
                                  name="companyName"
                                  defaultValue={settings.companyName || ""}
                                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  required
                                />  
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Color  (Hex)</label>
                                <div className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  name="brandColorPicker"
                                  defaultValue={settings.brandColor || "#4F46E5"}
                                  className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer p-0.5"
                                />
                                <input
                                  type="text"
                                  name="brandColor"
                                  defaultValue={settings.brandColor || "#4F46E5"}
                                  className="flex-1 text-sm font-mono border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  required
                                />    
                            </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                     {/* EMAIL Template Overrides */}
                      <div className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-indigo-600" />
                            Email Template Copy
                        </h2>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Line  (Step 1)</label>
                            <input
                              type="text"
                              name="emailSubjectStep1"
                              defaultValue={settings.emailSubjectStep1 || ""}
                              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              required
                            />  
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save Branding Settings</span>
                        </button>
                    </form>
                </div>
            </div>
        )
}