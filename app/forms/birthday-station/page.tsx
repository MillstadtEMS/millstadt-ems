import type { Metadata } from "next";
import BirthdayStationClient from "./BirthdayStationClient";

export const metadata: Metadata = {
  title: "Birthday Party at Our Station",
  description: "Request to host a birthday party at the Millstadt EMS station — explore the ambulance, meet the crew, and make it a day to remember.",
};

export default function BirthdayStationPage() {
  return <BirthdayStationClient />;
}
