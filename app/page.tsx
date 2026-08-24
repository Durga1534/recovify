import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardPage from "./dashboard/page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <DashboardPage />
    </div>
  );
}
