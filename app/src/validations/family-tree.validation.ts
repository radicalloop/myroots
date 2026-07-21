import { z } from "zod";
import dayjs from "dayjs";
import { Gender } from "@/types/api.types";

const optionalPersonDate = (message: string) =>
  z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) => !value?.trim() || !dayjs(value.trim()).isAfter(dayjs(), "day"),
      {
        message,
      },
    );

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: passwordRules,
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
});

export const treeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
});

export const shareSchema = z.object({
  sharedWithEmail: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  permission: z.enum(["VIEW", "EDIT"]),
});

export const personSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  gender: z.nativeEnum(Gender).optional(),
  birth_date: optionalPersonDate("Birth date cannot be in the future"),
  death_date: optionalPersonDate("Death date cannot be in the future"),
  birth_place: z.string().max(255).optional().nullable(),
  current_place: z.string().max(255).optional().nullable(),
  health_note: z.string().max(5000).optional().nullable(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type TreeFormValues = z.infer<typeof treeSchema>;
export type ShareFormValues = z.infer<typeof shareSchema>;
export type PersonFormValues = z.infer<typeof personSchema>;
