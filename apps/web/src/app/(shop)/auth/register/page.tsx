import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create Account — Cold Spring Liquor" };

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
