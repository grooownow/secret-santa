import type { Metadata } from "next";
import { SignInPage } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in" };

interface SignInProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function SignIn({ searchParams }: SignInProps) {
  const { callbackUrl } = await searchParams;
  return <SignInPage callbackUrl={callbackUrl} />;
}
