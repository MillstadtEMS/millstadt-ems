"use server";

import { addTestimonial } from "@/lib/testimonials";
import { sendApprovalEmail } from "@/lib/email";

export type FormState = { success: true } | { error: string } | null;

export async function submitTestimonial(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const message = (formData.get("message") as string ?? "").trim();
  const rawName = (formData.get("name") as string ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";

  if (!message || message.length < 15) {
    return { error: "Please write at least a sentence about your experience." };
  }
  if (message.length > 1000) {
    return { error: "Please keep your message under 1000 characters." };
  }

  const name = anonymous ? null : (rawName || null);

  let testimonial;
  try {
    testimonial = await addTestimonial({ message, name, anonymous });
  } catch (err) {
    console.error("Testimonial DB save failed:", err);
    return { error: "Could not save your testimonial right now. Please try again in a moment." };
  }

  // Email is best-effort — testimonial is already saved
  try {
    await sendApprovalEmail(testimonial);
  } catch (err) {
    console.error("Testimonial email failed (testimonial still saved):", err);
  }

  return { success: true };
}
