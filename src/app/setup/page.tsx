import { connection } from "next/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff } from "@/models/Staff";
import { SetupForm } from "@/components/auth/SetupForm";

export default async function SetupPage() {
  // Whether setup is still open is a per-request DB fact — never bake it in at build time.
  await connection();
  await connectToDatabase();
  if ((await Staff.countDocuments()) > 0) redirect("/login");
  return <SetupForm />;
}
