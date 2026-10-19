import { enabledSocialProviders } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <LoginForm providers={enabledSocialProviders} />;
}
