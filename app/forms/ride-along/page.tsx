import type { Metadata } from "next";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, RadioGroup, FieldGrid,
} from "@/components/forms/VillaStyle";

export const metadata: Metadata = {
  title: "Ride-Along / Volunteer Request",
  description: "Request a ride-along or volunteer hours with Millstadt Ambulance Service.",
};

const requestTypes = [
  "Community Service Hours",
  "Pre-Med Volunteer / Shadow Hours",
  "Pre-PA / Pre-NP Volunteer / Shadow Hours",
  "Civilian Observation / Interest",
  "Other Volunteer / Educational Purpose",
];

export default function RideAlongPage() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PageHeader
        eyebrow="Volunteer"
        title="Ride-Along Request"
        intro={[
          "Request a ride-along or volunteer hours with Millstadt EMS for clinical hours, community service, or civilian observation.",
          "All requests are subject to availability, background check requirements, and leadership approval.",
        ]}
      />

      <div className="wrap py-16 max-w-[920px]">
        <ContactFormWrapper
          formType="Ride Along Request"
          disclaimer="Requests are reviewed by Millstadt EMS leadership. All submissions are subject to availability, background check requirements, and leadership approval."
        >
          <Section>
            <SectionHeader number="1" title="Personal Information" />
            <FieldGrid cols={2}>
              <div><Label required>First Name</Label><Input name="first_name" required placeholder="First name" /></div>
              <div><Label required>Last Name</Label><Input name="last_name" required placeholder="Last name" /></div>
              <div><Label required>Phone</Label><Input name="phone" type="tel" required placeholder="(618) 000-0000" /></div>
              <div><Label required>Email</Label><Input name="email" type="email" required placeholder="you@email.com" /></div>
              <div><Label required>Date of Birth</Label><Input name="dob" type="date" required /></div>
              <div><Label>School / Organization</Label><Input name="school" placeholder="e.g. SWIC, SIU School of Medicine" /></div>
            </FieldGrid>
          </Section>

          <Section>
            <SectionHeader number="2" title="Request Details" subtitle="What kind of ride-along are you requesting?" />
            <Label required>Purpose of Ride-Along</Label>
            <RadioGroup name="purpose" required options={requestTypes} />
            <div className="mt-8" />
            <FieldGrid cols={2}>
              <div><Label>Preferred Date</Label><Input name="preferred_date" type="date" /></div>
              <div><Label>Hours Needed</Label><Input name="hours" type="number" min={1} placeholder="e.g. 8" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Additional Information</Label>
              <Textarea name="notes" rows={6} placeholder="Any additional context about your request..." />
            </div>
          </Section>
        </ContactFormWrapper>
      </div>
    </main>
  );
}
