import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; ref?: string }> }) {
  const { next, ref } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  const referral = ref ?? (await cookies()).get("rp_ref")?.value ?? "";

  return (
    <div className="my-6 w-full max-w-2xl rounded-3xl border border-navy-100 bg-white p-6 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold">Create your student account</h1>
      <p className="mt-1 text-sm text-navy-500">
        Free to create. You only pay when you register for a competition. Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
      <RegisterForm next={next ?? ""} referralCode={referral} />
    </div>
  );
}
