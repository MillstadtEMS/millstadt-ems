import type { Metadata } from "next";
import BirthdayClient from "./BirthdayClient";

export const metadata: Metadata = {
  title: "Birthday Party Request",
  description: "Request a Millstadt EMS ambulance appearance for a birthday party or celebration.",
};

export default function BirthdayPage() {
  return <BirthdayClient />;
}
