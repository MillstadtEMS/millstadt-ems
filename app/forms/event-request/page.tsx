import type { Metadata } from "next";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, RadioGroup, FieldGrid,
} from "@/components/forms/VillaStyle";

export const metadata: Metadata = {
  title: "Event / Visit Request",
  description: "Request a Millstadt EMS appearance at a community event, school visit, or safety demonstration.",
};

const eventTypes = [
  "School Visit",
  "Safety Demonstration",
  "Community Fair / Festival",
  "Health / Wellness Event",
  "EMS Standby Coverage",
  "Other Community Event",
];

export default function EventRequestPage() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PageHeader
        eyebrow="Community"
        title="Event / Visit Request"
        intro={[
          "Request a Millstadt EMS appearance at your school, event, or community program.",
          "All requests are subject to unit and crew availability. We will contact you to confirm.",
        ]}
      />

      <div className="wrap pt-16 pb-40 max-w-[920px]">
        <ContactFormWrapper
          formType="Event Appearance Request"
          disclaimer="Requests are subject to unit and crew availability. We will contact you to confirm."
        >
          <Section>
            <SectionHeader number="1" title="Contact Information" />
            <FieldGrid cols={2}>
              <div><Label required>First Name</Label><Input name="first_name" required placeholder="First name" /></div>
              <div><Label required>Last Name</Label><Input name="last_name" required placeholder="Last name" /></div>
              <div><Label required>Phone</Label><Input name="phone" type="tel" required placeholder="(618) 000-0000" /></div>
              <div><Label required>Email</Label><Input name="email" type="email" required placeholder="you@email.com" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label required>Organization / School</Label>
              <Input name="organization" required placeholder="e.g. Millstadt CCSD #160, St. James Catholic School" />
            </div>
          </Section>

          <Section>
            <SectionHeader number="2" title="Event Details" />
            <Label required>Type of Event</Label>
            <RadioGroup name="event_type" required columns={2} options={eventTypes} />
            <div className="mt-8" />
            <FieldGrid cols={2}>
              <div><Label required>Event Date</Label><Input name="event_date" type="date" required /></div>
              <div><Label>Event Time</Label><Input name="event_time" type="time" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label required>Event Location / Address</Label>
              <Input name="location" required placeholder="Full address or location name" />
            </div>
            <div className="mt-6">
              <Label>Expected Attendance</Label>
              <Input name="attendance" type="number" min={1} placeholder="Approx. number of people" />
            </div>
            <div className="mt-6">
              <Label>Additional Details</Label>
              <Textarea name="details" rows={6} placeholder="Describe the event and what you'd like Millstadt EMS to do..." />
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
                I understand that Millstadt Ambulance Service operates as an active emergency response agency.
                In the event that the assigned unit is needed to respond to a medical emergency, it may be unable
                to attend, arrive late, or may need to leave the event early. Emergency response to our community
                will always take priority.
              </span>
            </label>
          </Section>
        </ContactFormWrapper>
      </div>
      <div style={{ height: "10rem" }} aria-hidden />
    </main>
  );
}
