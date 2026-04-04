import type { Metadata } from "next";
import VitalsCalculator from "./VitalsCalculator";

export const metadata: Metadata = {
  title: "Vital Signs Reference Tool",
  description:
    "Interactive vital signs reference tool from Millstadt Ambulance Service. Check blood pressure, heart rate, oxygen saturation, temperature, respiratory rate, and blood glucose ranges. For educational use only.",
};

export default function VitalsPage() {
  return <VitalsCalculator />;
}
