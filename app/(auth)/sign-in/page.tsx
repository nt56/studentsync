import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In | StudentSync",
  description: "Sign in to access your college events and dashboard.",
};

export default function SignInPage() {
  return <SignInForm />;
}
