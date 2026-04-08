"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import ContactFormWrapper from "@/components/ContactFormWrapper";

const inputClass =
  "w-full bg-[#040d1a] border border-white/10 rounded-2xl px-6 py-5 text-white text-lg focus:outline-none focus:border-[#f0b429]/50 transition-colors placeholder:text-slate-600";

const labelClass = "block text-slate-400 text-sm font-bold tracking-wide mb-4";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pb-8 border-b border-white/8">
      <Image
        src="/images/millstadt-ems/star-of-life.png"
        alt=""
        width={30}
        height={30}
        style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }}
      />
      <h2 className="text-white font-black text-2xl">{title}</h2>
    </div>
  );
}

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

    const particles: {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number; rotSpeed: number; opacity: number;
    }[] = [];

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

    const bursts: { x: number; y: number; sparks: { angle: number; speed: number; life: number; color: string }[]; life: number }[] = [];

    const burstPositions = [
      { x: canvas.width * 0.15, y: canvas.height * 0.25 },
      { x: canvas.width * 0.85, y: canvas.height * 0.2 },
      { x: canvas.width * 0.5, y: canvas.height * 0.15 },
      { x: canvas.width * 0.3, y: canvas.height * 0.35 },
      { x: canvas.width * 0.75, y: canvas.height * 0.3 },
    ];

    burstPositions.forEach((pos, i) => {
      setTimeout(() => {
        const sparks = [];
        for (let s = 0; s < 40; s++) {
          sparks.push({
            angle: (s / 40) * Math.PI * 2,
            speed: Math.random() * 5 + 3,
            life: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
        bursts.push({ x: pos.x, y: pos.y, sparks, life: 1 });
      }, i * 400);
    });

    const start = performance.now();
    const duration = 4000;
    let animId: number;

    function draw(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - progress * 1.2);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });

      bursts.forEach((burst) => {
        burst.life -= 0.018;
        burst.sparks.forEach((spark) => {
          spark.life -= 0.02;
          const sx = burst.x + Math.cos(spark.angle) * spark.speed * (1 - spark.life) * 60;
          const sy = burst.y + Math.sin(spark.angle) * spark.speed * (1 - spark.life) * 60;
          ctx.save();
          ctx.globalAlpha = Math.max(0, spark.life);
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = spark.color;
          ctx.fill();
          ctx.restore();
        });
      });

      if (elapsed < duration + 500) {
        animId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

export default function BirthdayClient() {
  return (
    <>
      <Confetti />

      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <Link href="/forms" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Forms
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Fun</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Birthday Party Appearance Request
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Make it a birthday to remember — request a Millstadt EMS ambulance and crew to come to your celebration.",
              "Requests are subject to unit and crew availability. We will contact you to confirm. There is no fee for this service.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Body */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-16">

            {/* Sidebar */}
            <aside>
              <div className="sticky top-28 bg-[#071428] border border-white/8 rounded-2xl p-6">
                <div className="h-0.5 bg-gradient-to-r from-[#f0b429] to-transparent mb-5" />
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">About This Request</h3>
                <ul className="space-y-3 mb-6">
                  {[
                    "Millstadt EMS brings the ambulance right to your party",
                    "Kids get to explore the rig and meet the crew",
                    "Absolutely no fee for this service",
                    "Subject to unit and crew availability",
                    "We will call to confirm your request",
                  ].map(r => (
                    <li key={r} className="flex items-start gap-2.5 text-slate-400 text-sm leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] shrink-0 mt-1.5" />
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="pt-5 border-t border-white/6">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Questions? Contact us at<br />
                    <a href="tel:6182342021" className="text-[#f0b429] hover:text-[#f5c842] transition-colors">(618) 234-2021</a>
                  </p>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="lg:col-span-2">
              <ContactFormWrapper
                formType="Birthday Party Appearance Request"
                disclaimer="All submissions are subject to unit and crew availability. There is no fee for this service."
              >

                {/* Contact Information */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Contact Information" />
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                      <label className={labelClass}>Your First Name *</label>
                      <input type="text" name="first_name" required className={inputClass} placeholder="First name" />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name *</label>
                      <input type="text" name="last_name" required className={inputClass} placeholder="Last name" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input type="tel" name="phone" required className={inputClass} placeholder="(618) 000-0000" />
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input type="email" name="email" required className={inputClass} placeholder="you@email.com" />
                    </div>
                  </div>
                </div>

                <div className="h-8" />

                {/* Party Details */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Party Details" />
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                      <label className={labelClass}>Birthday Child&apos;s Name *</label>
                      <input type="text" name="child_name" required className={inputClass} placeholder="Child's first name" />
                    </div>
                    <div>
                      <label className={labelClass}>Age Turning</label>
                      <input type="number" name="age" min="1" max="18" className={inputClass} placeholder="e.g. 6" />
                    </div>
                    <div>
                      <label className={labelClass}>Party Date *</label>
                      <input type="date" name="party_date" required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Preferred Time</label>
                      <input type="time" name="party_time" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Party Address *</label>
                    <input type="text" name="address" required className={inputClass} placeholder="Full party address" />
                  </div>
                  <div>
                    <label className={labelClass}>Approx. Number of Kids</label>
                    <input type="number" name="num_kids" min="1" className={inputClass} placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className={labelClass}>Special Requests or Notes</label>
                    <textarea name="notes" rows={6} className={`${inputClass} resize-none`} placeholder="Any special requests, themes, or other details..." />
                  </div>
                </div>

              </ContactFormWrapper>
            </div>

          </div>
        </div>
      </section>

      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
