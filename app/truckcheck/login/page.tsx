import { redirect } from "next/navigation";

/**
 * Truck Check login is now consolidated into the Employee Lounge.
 * Anyone signed into the Lounge can submit a truck check; the standalone
 * shared password is retired.
 */
export default function TruckCheckLoginRedirect() {
  redirect("/lounge/login");
}
