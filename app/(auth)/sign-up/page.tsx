import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up | StudentSync",
  description:
    "Create your student account and start discovering college events.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
