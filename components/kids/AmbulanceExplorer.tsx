"use client";

import Image from "next/image";
import { useState, type ComponentType } from "react";
import {
  Ambulance,
  Backpack,
  ClipboardCheck,
  HeartPulse,
  Radio,
  ShieldCheck,
  Stethoscope,
  type LucideProps,
} from "lucide-react";

type ExplorerSpot = {
  id: string;
  title: string;
  label: string;
  x: string;
  y: string;
  icon: ComponentType<LucideProps>;
  detail: string;
  kidLine: string;
};

const spots: ExplorerSpot[] = [
  {
    id: "ambulance",
    title: "The ambulance",
    label: "Truck",
    x: "49%",
    y: "58%",
    icon: Ambulance,
    detail: "The ambulance is built like a small treatment room on wheels, with lights, radios, medical supplies, and room for the crew to work safely.",
    kidLine: "If you see the lights and hear the siren, give the ambulance room and stay with your grown-up.",
  },
  {
    id: "monitor",
    title: "Heart monitor",
    label: "Monitor",
    x: "62%",
    y: "43%",
    icon: HeartPulse,
    detail: "EMS crews can check heart rhythm, oxygen level, blood pressure, and other important signs during an emergency.",
    kidLine: "The wires and stickers help the crew learn what the body is doing.",
  },
  {
    id: "radio",
    title: "Radio and dispatch",
    label: "Radio",
    x: "37%",
    y: "37%",
    icon: Radio,
    detail: "Radios help crews talk with dispatch, hospitals, and other responders so everyone knows where help is needed.",
    kidLine: "Clear talking helps the right helpers get to the right place.",
  },
  {
    id: "bag",
    title: "Jump bag",
    label: "Bag",
    x: "70%",
    y: "70%",
    icon: Backpack,
    detail: "The jump bag carries supplies the crew may need quickly before moving someone to the ambulance.",
    kidLine: "Only trained grown-ups use these tools. Kids can help by making space.",
  },
  {
    id: "stretcher",
    title: "Stretcher",
    label: "Stretcher",
    x: "28%",
    y: "66%",
    icon: Stethoscope,
    detail: "The stretcher helps move someone safely when walking would hurt, be unsafe, or make the emergency worse.",
    kidLine: "The belts help keep the patient safe while the ambulance moves.",
  },
  {
    id: "checklist",
    title: "Safety checklist",
    label: "Checklist",
    x: "78%",
    y: "32%",
    icon: ClipboardCheck,
    detail: "Crews check equipment again and again so supplies are ready before the next emergency call.",
    kidLine: "Prepared helpers practice before there is a problem.",
  },
];

export default function AmbulanceExplorer() {
  const [activeId, setActiveId] = useState(spots[0].id);
  const active = spots.find((spot) => spot.id === activeId) ?? spots[0];
  const ActiveIcon = active.icon;

  return (
    <section className="bg-[#f4f8fb] py-14 text-[#061121]">
      <div className="wrap box-border">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#1b58c9]">
              Explore The Ambulance
            </div>
            <h2 className="mt-4 text-balance text-4xl font-black leading-tight md:text-5xl">
              Pick a part of the rig and learn what the tools do.
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
              A kid-friendly look at EMS equipment. It explains what families
              may see during a station visit without turning it into scary
              medical training.
            </p>
          </div>
          <div
            id="ambulance-explorer-detail"
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-[#061121]/10 bg-white p-5 shadow-xl shadow-slate-200/70"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1b58c9] text-white">
                <ActiveIcon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1b58c9]">
                  Now Exploring
                </div>
                <h3 className="mt-2 text-2xl font-black leading-tight">{active.title}</h3>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-700">{active.detail}</p>
                <p className="mt-4 rounded-xl bg-[#f0b429]/18 p-4 text-sm font-bold leading-6 text-[#5f4207]">
                  {active.kidLine}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-[#061121]/10 bg-[#061121] shadow-2xl shadow-slate-300/70 sm:min-h-[460px]">
            <Image
              src="/images/millstadt-ems/ambulance-explorer.jpg"
              alt="Millstadt EMS ambulance ready for a community visit"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061121]/70 via-transparent to-[#061121]/15" />
            {spots.map((spot) => {
              const Icon = spot.icon;
              const isActive = spot.id === activeId;
              return (
                <button
                  key={spot.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-controls="ambulance-explorer-detail"
                  onClick={() => setActiveId(spot.id)}
                  className={`absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#061121] md:inline-flex ${
                    isActive
                      ? "border-[#f0b429] bg-[#f0b429] text-[#061121]"
                      : "border-white/35 bg-[#061121]/78 text-white backdrop-blur hover:border-[#f0b429]"
                  }`}
                  style={{ left: spot.x, top: spot.y }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {spot.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            {spots.map((spot) => {
              const Icon = spot.icon;
              const isActive = spot.id === activeId;
              return (
                <button
                  key={spot.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-controls="ambulance-explorer-detail"
                  onClick={() => setActiveId(spot.id)}
                  className={`flex min-h-16 items-center gap-4 rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#1b58c9] focus:ring-offset-2 ${
                    isActive
                      ? "border-[#1b58c9] bg-[#1b58c9] text-white"
                      : "border-slate-200 bg-white text-[#061121] hover:border-[#1b58c9]/45"
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-white/15" : "bg-[#1b58c9]/10 text-[#1b58c9]"}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-base font-black leading-tight">{spot.title}</span>
                    <span className={`mt-1 block text-xs font-bold leading-5 ${isActive ? "text-blue-100" : "text-slate-600"}`}>
                      {spot.kidLine}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-950">
          <ShieldCheck className="mt-1 h-6 w-6 shrink-0" aria-hidden />
          <p className="text-sm font-bold leading-6 text-emerald-950">
            This explorer is for family learning only. In a real emergency,
            call 911, listen to dispatchers, and follow the directions of
            responding crews.
          </p>
        </div>
      </div>
    </section>
  );
}
