import type { Metadata } from "next";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, RadioGroup, CheckGroup, FieldGrid, Divider,
} from "@/components/forms/VillaStyle";

export const metadata: Metadata = {
  title: "Employment Application Request",
  description: "Request an employment application to join the Millstadt Ambulance Service team.",
};

const positions = [
  "EMT (Emergency Medical Technician)",
  "Paramedic",
  "Prehospital Registered Nurse (RN)",
  "Prehospital Advanced Practice Nurse (APN)",
  "Prehospital Physician Assistant (PA)",
  "Prehospital Physician (MD/DO)",
];

const availability = [
  "Day Shifts", "Night Shifts", "Weekends", "Holidays", "Overtime",
  "On-Call", "Part-Time", "Full-Time", "PRN / As Needed",
];

export default function EmploymentPage() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PageHeader
        eyebrow="Careers"
        title="Employment Application Request"
        intro={[
          "Fill out the form below and we will send you a full application when positions become available.",
          "All requests are reviewed by Millstadt EMS leadership and responded to within 5–7 business days.",
        ]}
      />

      <div className="wrap pt-16 pb-40 max-w-[920px]">
        <ContactFormWrapper
          formType="Employment Application"
          disclaimer="Received by Millstadt EMS leadership. You will be contacted within 5–7 business days."
        >
          <Section>
            <SectionHeader number="1" title="Personal Information" subtitle="How we'll reach you." />
            <FieldGrid cols={2}>
              <div><Label required>First Name</Label><Input name="first_name" required placeholder="First name" /></div>
              <div><Label required>Last Name</Label><Input name="last_name" required placeholder="Last name" /></div>
              <div><Label required>Phone</Label><Input name="phone" type="tel" required placeholder="(618) 000-0000" /></div>
              <div><Label required>Email</Label><Input name="email" type="email" required placeholder="you@email.com" /></div>
            </FieldGrid>
            <Divider />
            <Label>Mailing Address</Label>
            <Input name="address" placeholder="Street address, City, State, ZIP" />
          </Section>

          <Section>
            <SectionHeader number="2" title="Position of Interest" subtitle="Select the role you're applying for." />
            <RadioGroup name="position" required columns={2} options={positions} />
          </Section>

          <Section>
            <SectionHeader number="3" title="Credentials & Experience" subtitle="License, certifications, and time in EMS." />

            <Label>Illinois EMS License</Label>
            <FieldGrid cols={2}>
              <div><Label>License Number</Label><Input name="il_license" placeholder="e.g. IL-P-12345" /></div>
              <div><Label>Expiration Date</Label><Input name="il_license_expiry" type="date" /></div>
            </FieldGrid>
            <Divider />

            <Label>BLS Card Expiration</Label>
            <Input name="bls_expiry" type="date" />
            <Divider />

            <Label>ACLS Expiration <span className="ml-2 text-[10px] tracking-widest text-[#60a5fa]">— ALS Only</span></Label>
            <Input name="acls_expiry" type="date" />
            <Divider />

            <Label>ITLS Expiration <span className="ml-2 text-[10px] tracking-widest text-[#60a5fa]">— ALS Only</span></Label>
            <Input name="itls_expiry" type="date" />
            <Divider />

            <Label>PALS Expiration <span className="ml-2 text-[10px] tracking-widest text-[#60a5fa]">— ALS Only</span></Label>
            <Input name="pals_expiry" type="date" />
            <Divider />

            <FieldGrid cols={2}>
              <div><Label>Other Certification / License</Label><Input name="certification" placeholder="e.g. Illinois Paramedic #12345" /></div>
              <div><Label>Years of EMS Experience</Label><Input name="years_experience" type="number" min={0} placeholder="0" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Tell us about yourself / additional notes</Label>
              <Textarea name="notes" rows={6} placeholder="Previous experience, why you want to join Millstadt EMS, etc." />
            </div>
          </Section>

          <Section>
            <SectionHeader number="4" title="I Am Willing To Work" subtitle="Check all that apply." />
            <CheckGroup name="availability" options={availability} columns={3} />
          </Section>
        </ContactFormWrapper>
      </div>
      <div style={{ height: "10rem" }} aria-hidden />
    </main>
  );
}
