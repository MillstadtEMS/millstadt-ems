import { redirect } from "next/navigation";

/**
 * Admin login is now consolidated into the Employee Lounge.
 * Only KJ + Jennifer Goetz (is_admin = true) can access admin tools, but
 * they sign in through /lounge/login like everyone else.
 */
export default function AdminLoginRedirect() {
  redirect("/lounge/login");
}
