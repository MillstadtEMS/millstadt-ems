"use client";

import { useEffect, useRef } from "react";
import ContactFormWrapper from "@/components/ContactFormWrapper";
import {
  PageHeader, Section, SectionHeader, Label, Input, Textarea, FieldGrid,
} from "@/components/forms/VillaStyle";

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f0b429", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f97316", "#ffffff"];
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rotSpeed: number; opacity: number }[] = [];
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 10 + 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }
    const start = performance.now();
    const duration = 4000;
    let animId: number;
    function draw(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - progress * 1.2);
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      if (elapsed < duration + 500) animId = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

export default function BirthdayStationClient() {
  return (
    <main style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <Confetti />
      <PageHeader
        eyebrow="Community Fun"
        title="Birthday Party at Our Station"
        intro={[
          "Host your child's birthday celebration right at the Millstadt EMS station — explore the ambulance, meet the crew, and make it a day they will never forget.",
          "A small fee may apply. All requests are subject to station and crew availability.",
        ]}
      />

      <div className="wrap pt-16 max-w-[920px]">
        <ContactFormWrapper
          formType="Birthday Party at Station Request"
          disclaimer="A small fee may apply. All submissions are subject to station and crew availability."
        >
          <Section>
            <SectionHeader number="1" title="Contact Information" />
            <FieldGrid cols={2}>
              <div><Label required>Your First Name</Label><Input name="first_name" required placeholder="First name" /></div>
              <div><Label required>Last Name</Label><Input name="last_name" required placeholder="Last name" /></div>
              <div><Label required>Phone</Label><Input name="phone" type="tel" required placeholder="(618) 000-0000" /></div>
              <div><Label required>Email</Label><Input name="email" type="email" required placeholder="you@email.com" /></div>
            </FieldGrid>
          </Section>

          <Section>
            <SectionHeader number="2" title="Party Details" />
            <FieldGrid cols={2}>
              <div><Label required>Birthday Child&apos;s Name</Label><Input name="child_name" required placeholder="Child's first name" /></div>
              <div><Label>Age Turning</Label><Input name="age" type="number" min={1} max={18} placeholder="e.g. 6" /></div>
              <div><Label required>Preferred Date</Label><Input name="party_date" type="date" required /></div>
              <div><Label>Preferred Time</Label><Input name="party_time" type="time" /></div>
            </FieldGrid>
            <div className="mt-6">
              <Label>Approx. Number of Guests</Label>
              <Input name="num_guests" type="number" min={1} placeholder="e.g. 20" />
            </div>
            <div className="mt-6">
              <Label>Special Requests or Notes</Label>
              <Textarea name="notes" rows={6} placeholder="Any special requests, themes, or other details..." />
            </div>
          </Section>
        </ContactFormWrapper>
      </div>
      <div style={{ height: "10rem" }} aria-hidden />
    </main>
  );
}
