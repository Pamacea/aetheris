import { z } from "zod";

export const emailSchema = z.email().max(254);

export const passwordSchema = z.string().min(8).max(128);

export const signUpSchema = z.object({
  name: z.string().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignInInput = z.infer<typeof signInSchema>;
