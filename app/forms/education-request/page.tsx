import type { Metadata } from "next";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, RadioGroup, FieldGrid,
} from "@/components/forms/VillaStyle";

export const metadata: Metadata = {
  title: "Education Request",
  description:
    "Request a Millstadt EMS CPR class, Stop the Bleed training, AED instruction, school program, or other community education.",
};

const programs = [
  "CPR / AED — Community Class",
  "CPR / AED — School Program",
  "Stop the Bleed Training",
  "Hands-Only CPR Demo",
  "Child & Infant Safety Talk",
  "EMS Career Talk",
  "Senior Fall-Prevention Program",
  "Other (describe below)",
];

const audiences = [
  "Elementary School",
  "Middle / High School",
  "College / Trade School",
  "Workplace / Business",
  "Faith / Civic Group",
  "Senior Group",
  "General Public",
];

export default function EducationRequestPage() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PageHeader
        eyebrow="Community"
        title="Education Request"
        intro={[
          "Request a Millstadt EMS instructor for CPR, Stop the Bleed, AED, school visits, or other community education programs.",
          "We schedule based on instructor availability. A coordinator will reach out to confirm dates and class size.",
        ]}
      />

      <div className="wrap pt-8 sm:pt-12 max-w-[920px]">
        <ContactFormWrapper
          formType="Education Request"
          disclaimer="All instruction is subject to instructor availability. A coordinator will follow up to confirm details, class size, and any course fees."
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
              <Label>Organization / School (if any)</Label>
              <Input name="organization" placeholder="e.g. Millstadt CCSD #160, Sunrise Senior Living" />
            </div>
          </Section>

          <Section>
            <SectionHeader number="2" title="Program Requested" />
            <Label required>Type of Program</Label>
            <RadioGroup name="program" required columns={2} options={programs} />
            <div className="mt-8" />
            <Label required>Audience</Label>
            <RadioGroup name="audience" required columns={2} options={audiences} />
          </Section>

          <Section>
            <SectionHeader number="3" title="Logistics" />
            <FieldGrid cols={2}>
              <div><Label>Preferred Date</Label><Input name="preferred_date" type="date" /></div>
              <div><Label>Preferred Time</Label><Input name="preferred_time" type="time" /></div>
              <div><Label>Expected Class Size</Label><Input name="class_size" type="number" min={1} placeholder="Approximate headcount" /></div>
              <div><Label>Age Range</Label><Input name="age_range" placeholder="e.g. 3rd grade, adults 18+, mixed" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Class Location / Address</Label>
              <Input name="location" placeholder="Address where the class would be held, or 'open to EMS station'" />
            </div>
            <div className="mt-6">
              <Label>Additional Details</Label>
              <Textarea
                name="details"
                rows={6}
                placeholder="Goals for the program, special accommodations, any specific topics you want covered…"
              />
            </div>
          </Section>

          <Section>
            <SectionHeader number="4" title="Acknowledgment" />
            <label
              className="flex items-start gap-4 px-4 py-4 cursor-pointer transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <input type="checkbox" name="acknowledgment" required className="accent-[#f0b429] w-4 h-4 shrink-0 mt-1" />
              <span className="text-sm text-slate-300 leading-relaxed">
                I understand that Millstadt Ambulance Service is a 24/7 emergency response agency.
                Education programs are scheduled based on instructor availability and may need to be
                rescheduled if our crew is committed to an active call. Some courses (formal CPR
                certification, etc.) may have an associated fee that will be quoted before scheduling.
              </span>
            </label>
          </Section>
        </ContactFormWrapper>
      </div>
      <div style={{ height: "10rem" }} aria-hidden />
    </main>
  );
}
