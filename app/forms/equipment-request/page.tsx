import type { Metadata } from "next";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, RadioGroup, FieldGrid,
} from "@/components/forms/VillaStyle";

export const metadata: Metadata = {
  title: "Equipment Request",
  description:
    "Request loaned equipment from Millstadt Ambulance Service — AED, training mannequin, public-access kits, and more.",
};

const items = [
  "AED (loan / event use)",
  "CPR Training Mannequin",
  "Stop the Bleed Kit",
  "Blood Pressure Cuff",
  "Standby / Event First Aid Kit",
  "Other (describe below)",
];

const purposes = [
  "Community Event",
  "School / Classroom",
  "Workplace Training",
  "Sports / Athletic Event",
  "Faith / Civic Group",
  "Other",
];

export default function EquipmentRequestPage() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PageHeader
        eyebrow="Community"
        title="Equipment Request"
        intro={[
          "Request loaned equipment from Millstadt Ambulance Service for a community event, training, or program.",
          "Equipment availability is limited. A coordinator will reach out to confirm what we can provide and review any usage requirements.",
        ]}
      />

      <div className="wrap pt-8 sm:pt-12 max-w-[920px]">
        <ContactFormWrapper
          formType="Equipment Request"
          disclaimer="All equipment loans are subject to availability and a signed usage agreement. Items must be returned in the same condition and may be recalled if needed for emergency operations."
        >
          <Section>
            <SectionHeader number="1" title="Requestor Information" />
            <FieldGrid cols={2}>
              <div><Label required>First Name</Label><Input name="first_name" required placeholder="First name" /></div>
              <div><Label required>Last Name</Label><Input name="last_name" required placeholder="Last name" /></div>
              <div><Label required>Phone</Label><Input name="phone" type="tel" required placeholder="(618) 000-0000" /></div>
              <div><Label required>Email</Label><Input name="email" type="email" required placeholder="you@email.com" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Organization (if any)</Label>
              <Input name="organization" placeholder="School, business, civic group, etc." />
            </div>
          </Section>

          <Section>
            <SectionHeader number="2" title="What's Being Requested" />
            <Label required>Item Requested</Label>
            <RadioGroup name="item" required columns={2} options={items} />
            <div className="mt-8" />
            <Label required>Purpose</Label>
            <RadioGroup name="purpose" required columns={2} options={purposes} />
            <div className="mt-8" />
            <FieldGrid cols={2}>
              <div><Label required>Date Needed</Label><Input name="date_needed" type="date" required /></div>
              <div><Label>Return Date</Label><Input name="return_date" type="date" /></div>
              <div><Label>Quantity</Label><Input name="quantity" type="number" min={1} placeholder="How many?" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Where Will It Be Used</Label>
              <Input name="location" placeholder="Address / venue where the equipment will be in use" />
            </div>
            <div className="mt-6">
              <Label>Additional Details</Label>
              <Textarea
                name="details"
                rows={6}
                placeholder="Describe the event/use, expected attendance, who will operate the equipment, and any setup help you need."
              />
            </div>
          </Section>

          <Section>
            <SectionHeader number="3" title="Acknowledgment" />
            <label
              className="flex items-start gap-4 px-4 py-4 cursor-pointer transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <input type="checkbox" name="acknowledgment" required className="accent-[#f0b429] w-4 h-4 shrink-0 mt-1" />
              <span className="text-sm text-slate-300 leading-relaxed">
                I understand that Millstadt Ambulance Service equipment is operational property
                that may be recalled at any time for emergency response. I agree to return all
                loaned items in the same condition received, and accept responsibility for any
                loss or damage that occurs while in my care.
              </span>
            </label>
          </Section>
        </ContactFormWrapper>
      </div>
      <div style={{ height: "10rem" }} aria-hidden />
    </main>
  );
}
