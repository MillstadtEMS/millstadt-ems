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

  try {
    const testimonial = await addTestimonial({ message, name, anonymous });
    await sendApprovalEmail(testimonial);
    return { success: true };
  } catch (err) {
    console.error("Testimonial submission error:", err);
    return { error: "Something went wrong. Please try again or email us directly." };
  }
}
