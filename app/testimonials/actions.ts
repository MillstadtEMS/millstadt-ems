"use server";

import { addTestimonial } from "@/lib/testimonials";
import { sendApprovalEmail } from "@/lib/email";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";

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

  // Light up the in-lounge admin bell so leadership sees it without checking
  // their inbox. Best-effort — failure here doesn't roll back the submission.
  try {
    const displayName = testimonial.anonymous ? "Anonymous" : (testimonial.name || "Anonymous");
    await notifyAdminsInLounge({
      kind: "post",
      title: `New testimonial — ${displayName}`,
      bodyPreview: testimonial.message.slice(0, 180),
      linkUrl: "/admin/testimonials",
      sourceId: testimonial.id,
      actorId: null,
    });
  } catch (err) {
    console.error("Testimonial admin notification failed:", err);
  }

  return { success: true };
}
