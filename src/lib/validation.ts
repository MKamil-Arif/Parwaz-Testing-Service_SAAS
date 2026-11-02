import { z } from "zod";
import { CLASS_LEVEL_VALUES, DISTRICT_OPTIONS, GUARDIAN_RELATIONS, LEADERBOARD_NAME_MODES } from "@/lib/constants";
import { ageOn } from "@/lib/format";

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

export const emailField = z.string().trim().toLowerCase().max(256).pipe(z.email("Enter a valid email address"));

/** Pakistani mobile numbers: 03XXXXXXXXX or +923XXXXXXXXX (spaces/dashes ignored). */
export const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+92|0092|0)3\d{9}$/.test(v), "Enter a valid Pakistani mobile number, e.g. 0300 1234567");

export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use at least one letter and one number");

const dobField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth")
  .transform((v) => new Date(`${v}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Enter a valid date")
  .refine((d) => {
    const age = ageOn(d);
    return age >= 10 && age <= 30;
  }, "Date of birth looks incorrect for a school or college student");

const guardianFields = {
  guardianName: optionalText(150),
  guardianPhone: optionalText(20),
  guardianRelation: optionalText(50),
  guardianConsent: checkbox,
};

/** Students under 18 need a parent/guardian who has consented to their participation. */
function requireGuardianIfMinor(
  data: { dateOfBirth: Date; guardianName?: string; guardianPhone?: string; guardianRelation?: string; guardianConsent: boolean },
  ctx: z.RefinementCtx,
) {
  if (ageOn(data.dateOfBirth) >= 18) return;
  if (!data.guardianName) ctx.addIssue({ code: "custom", path: ["guardianName"], message: "Parent/guardian name is required for students under 18" });
  if (!data.guardianPhone || !/^(\+92|0092|0)3\d{9}$/.test(data.guardianPhone.replace(/[\s-]/g, "")))
    ctx.addIssue({ code: "custom", path: ["guardianPhone"], message: "Enter the parent/guardian's mobile number" });
  if (!data.guardianRelation || !(GUARDIAN_RELATIONS as readonly string[]).includes(data.guardianRelation))
    ctx.addIssue({ code: "custom", path: ["guardianRelation"], message: "Select the relationship" });
  if (!data.guardianConsent)
    ctx.addIssue({ code: "custom", path: ["guardianConsent"], message: "Parent/guardian consent is required for students under 18" });
}

const profileFields = {
  city: z.string().trim().min(2, "Enter your city or town").max(100),
  district: z.enum(DISTRICT_OPTIONS, "Select your district"),
  institution: z.string().trim().min(3, "Enter your school or college").max(200),
  classLevel: z.enum(CLASS_LEVEL_VALUES, "Select your current class"),
  dateOfBirth: dobField,
  ...guardianFields,
};

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name").max(150),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
    ...profileFields,
    referralCode: optionalText(16),
    acceptTerms: checkbox.refine((v) => v, "You must accept the Terms and Conditions and Privacy Policy"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword)
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
    requireGuardianIfMinor(data, ctx);
  });

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name").max(150),
    phone: phoneField,
    ...profileFields,
    leaderboardNameMode: z.enum(LEADERBOARD_NAME_MODES),
    mediaConsent: checkbox,
  })
  .superRefine(requireGuardianIfMinor);

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(100),
  next: optionalText(300),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(150),
  email: emailField,
  phone: optionalText(20),
  category: z.enum(["GENERAL", "REGISTRATION", "PAYMENT", "EXAM", "TECHNICAL", "COMPLAINT", "PARTNERSHIP"]),
  subject: z.string().trim().min(3, "Enter a subject").max(200),
  message: z.string().trim().min(10, "Please describe your question (at least 10 characters)").max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export { optionalText };
