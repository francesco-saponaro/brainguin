// schemas/registerSchema.ts
import { TFunction } from "i18next";
import { z } from "zod";

export const LoginSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .min(1, { message: t("formValidations.emailRequired") }) // This handles "required" check
      .email({ message: t("formValidations.invalidEmail") }), // Note: .email() takes an object or string
    pwd: z.string().min(1, { message: t("formValidations.passwordRequired") }), // Handles empty string
  });

export type LoginSchemaType = z.infer<ReturnType<typeof LoginSchema>>;

export const SignupSchema = (t: TFunction) =>
  z
    .object({
      email: z
        .string()
        .min(1, { message: t("formValidations.emailRequired") }) // Check for empty first
        .email({ message: t("formValidations.invalidEmail") }),
      pwd: z
        .string()
        .min(6, { message: t("formValidations.passwordTooShort") }), // Matches your login schema key structure
      confirmPwd: z
        .string()
        .min(1, { message: t("formValidations.passwordRequired") }), // Optional: ensure it's not empty
    })
    .refine((data) => data.pwd === data.confirmPwd, {
      message: t("formValidations.passwordsDoNotMatch"), // You will need to add this key to your translation file
      path: ["confirmPwd"],
    });

export type SignupSchemaType = z.infer<ReturnType<typeof SignupSchema>>;
