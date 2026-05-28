import { redirect } from "next/navigation";

/**
 * Inventory login is now consolidated into the Employee Lounge. Anyone
 * signed into the Lounge can use /inventory; standalone password retired.
 */
export default function InventoryLoginRedirect() {
  redirect("/lounge/login");
}
