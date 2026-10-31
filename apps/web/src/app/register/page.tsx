import { enabledSocialProviders } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm providers={enabledSocialProviders} />;
}
