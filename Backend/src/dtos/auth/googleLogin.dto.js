import { z } from "zod";
import { ValidationError } from "../../core/auth/errors.js";

const schema = z.object({
  credential: z.string().min(1, "Google credential is required"),
  fcmToken: z.string().optional(),
  platform: z.enum(["web", "mobile"]).optional(),
  ref: z.string().trim().max(64).optional().or(z.literal("")),
});

export const validateGoogleLoginDto = (body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.errors[0].message);
  }
  return result.data;
};
