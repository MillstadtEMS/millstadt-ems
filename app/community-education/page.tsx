import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Education",
  description:
    "Millstadt Ambulance Service community outreach, public safety education, school visits, and preparedness programs for Millstadt, Illinois.",
};

const safetyTopics = [
  {
    title: "Recognizing a Stroke — BE-FAST",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
    content: [
      "B — Balance: Sudden loss of balance, coordination, or dizziness with no other explanation.",
      "E — Eyes: Sudden blurred vision, double vision, or loss of vision in one or both eyes.",
      "F — Face: Ask the person to smile. Does one side of the face droop?",
      "A — Arms: Ask the person to raise both arms. Does one arm drift downward or feel weak?",
      "S — Speech: Ask the person to repeat a simple phrase. Is their speech slurred, strange, or hard to understand?",
      "T — Time: If ANY of these signs are present, call 9-1-1 IMMEDIATELY. Time is brain — every minute without treatment, approximately 1.9 million brain cells die. Do not wait to see if symptoms improve.",
      "Do not let the person drive themselves. Do not give them food, water, or medication. Note the exact time symptoms started — this is critical information for the medical team.",
      "Even if symptoms seem to go away on their own, call 9-1-1. A transient ischemic attack (TIA), or 'mini-stroke,' is a medical emergency and a major warning sign of a larger stroke to come.",
    ],
  },
  {
    title: "Recognizing Sepsis — TIME",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
    content: [
      "Sepsis is a life-threatening medical emergency caused by the body's extreme response to an infection. It can progress rapidly — hours matter. Use the TIME acronym to recognize the warning signs.",
      "T — Temperature: An abnormally high fever (above 101°F / 38.3°C) or an unusually low body temperature (below 96.8°F / 36°C) can both be signs of sepsis. A dropping or subnormal temperature is especially concerning.",
      "I — Infection: Is there a known or suspected infection — such as a urinary tract infection, pneumonia, wound infection, or recent surgery? Sepsis always starts with an infection. Even infections that seem minor can trigger sepsis in vulnerable individuals.",
      "M — Mental Decline: Sudden confusion, disorientation, extreme drowsiness, or a change in mental status that is new and unexplained is one of the most important early warning signs of sepsis. If someone who is normally alert suddenly seems \"not right,\" take it seriously.",
      "E — Extremely Ill: Does the person say they feel like they might die, or look far sicker than you would expect from their known illness? A severe, unexplained deterioration — especially in someone who is elderly, immunocompromised, or has a chronic illness — warrants immediate evaluation.",
      "Other signs of sepsis include: rapid heart rate, rapid breathing, low blood pressure or signs of shock (pale or mottled skin, cold and clammy extremities), decreased urination, or extreme fatigue and weakness.",
      "If you suspect sepsis — especially in an elderly person, infant, or anyone with a compromised immune system — call 9-1-1 immediately. Do not drive to the hospital. Time from onset to treatment directly affects survival. Sepsis can become septic shock and organ failure within hours.",
      "Sepsis is not always obvious. It can look like the flu, or simply like someone getting worse from an infection that seemed manageable. Trust your instincts. If something seems wrong, get help.",
    ],
  },
  {
    title: "CPR & Cardiac Emergencies",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    content: [
      "Call 9-1-1 immediately if someone is unresponsive and not breathing normally.",
      "Begin chest compressions — push hard and fast, at least 2 inches deep at 100–120 per minute.",
      "If trained, give rescue breaths: 30 compressions to 2 breaths.",
      "Use an AED as soon as one is available — turn it on and follow the voice prompts.",
      "Do not stop CPR until EMS arrives or an AED advises otherwise.",
    ],
  },
  {
    title: "Choking Relief",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    content: [
      "Ask the person if they are choking. If they cannot speak, cough, or breathe, act immediately.",
      "Stand behind the person, lean them forward slightly, and give 5 firm back blows between the shoulder blades.",
      "If back blows fail, perform 5 abdominal thrusts (Heimlich maneuver): hands above the navel, push in and up.",
      "Alternate back blows and abdominal thrusts until the object is dislodged or EMS arrives.",
      "For infants: use gentle back blows and 2-finger chest thrusts. Never do abdominal thrusts on an infant.",
    ],
  },
  {
    title: "Fire Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M13.5 .67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
      </svg>
    ),
    content: [
      "Install smoke alarms on every level of your home, inside bedrooms, and outside sleeping areas.",
      "Test smoke alarms monthly and replace batteries annually (or use 10-year sealed-battery alarms).",
      "Create and practice a home fire escape plan with two exits from every room.",
      "In a fire: get low, move fast. Feel doors before opening — if hot, use another exit.",
      "Once out, stay out. Call 9-1-1 from outside.",
      "Sleep with your bedroom door closed. A closed door can slow the spread of fire, heat, and toxic smoke — giving you critical extra minutes to escape and significantly improving your chances of survival.",
    ],
  },
  {
    title: "Tornado Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M6 4h12v2H6zm2 4h8v2H8zm2 4h4v2h-4zm1 4h2v2h-2zm.5 4h1v2h-1z" />
      </svg>
    ),
    content: [
      "A Tornado Watch means conditions are favorable for tornadoes. Stay alert and be ready to act.",
      "A Tornado Warning means a tornado has been spotted or indicated on radar. Seek shelter immediately.",
      "A Tornado Emergency is the highest level of tornado alert — issued when a confirmed, extremely dangerous tornado is threatening a populated area. This is life-threatening. Take cover immediately, do not wait.",
      "A PDS (Particularly Dangerous Situation) Watch is a rare, elevated tornado watch issued when atmospheric conditions are exceptionally favorable for long-track, violent tornadoes (EF4–EF5). Treat a PDS Watch with extreme urgency and have your shelter plan ready before a warning is issued.",
      "Go to the lowest level of a sturdy building — interior room, away from windows.",
      "Mobile homes and vehicles are not safe. If caught outside, lie flat in a low ditch and protect your head.",
      "Do not try to outrun a tornado in a vehicle if it is close. Get out and find a sturdy shelter.",
      "Never shelter under an overpass during a tornado. Overpasses create a wind tunnel effect that dramatically increases wind speed and debris — making them one of the most dangerous places you can be. Get low and find solid interior shelter instead.",
    ],
  },
  {
    title: "Severe Thunderstorm Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 17l-4 5v-4H7l4-5v4h2z" />
      </svg>
    ),
    content: [
      "Move indoors immediately when thunder is heard. Lightning can strike miles from the storm.",
      "Stay away from windows and doors. Avoid contact with plumbing and electrical appliances.",
      "Do not use a corded telephone during a storm.",
      "If caught outdoors: crouch low on the balls of your feet, minimize contact with the ground, and avoid high ground, trees, and water.",
      "Wait 30 minutes after the last thunder before going back outside.",
    ],
  },
  {
    title: "Earthquake Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
      </svg>
    ),
    content: [
      "Drop, Cover, and Hold On — get under a sturdy desk or table and hold on until shaking stops.",
      "Stay away from windows, heavy furniture, and anything that could fall.",
      "If outside, move to an open area away from buildings, power lines, and trees.",
      "After the shaking stops, check for injuries and hazards — gas leaks, structural damage, downed lines.",
      "Be prepared for aftershocks. Follow local emergency management guidance.",
    ],
  },
  {
    title: "Turn Around, Don't Drown — Flood Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
    content: [
      "Turn Around, Don't Drown — never attempt to drive through a flooded road. Just 6 inches of moving water can knock a person down, and 12 inches can sweep a small vehicle away.",
      "Two feet of water is enough to float most cars and SUVs. Floodwaters hide washed-out roads, downed power lines, and debris — you cannot judge depth or current from inside a vehicle.",
      "If your vehicle stalls in rising water, abandon it immediately and move to higher ground. Do not wait for water to recede.",
      "Most flood fatalities occur in vehicles. The road may look passable — it rarely is. Barricades are there for your safety; do not drive around them.",
      "Flash floods can develop within minutes, even in areas that are not currently raining. Be aware of your surroundings and monitor weather alerts when storms are in the area.",
      "If caught in a rapidly rising vehicle, escape through a window before water pressure makes the door impossible to open. A window breaker tool can be life-saving.",
      "After flooding, stay off roads until officials confirm they are clear. Roads may appear dry but can be structurally compromised beneath the surface.",
    ],
  },
  {
    title: "Downed Power Lines",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
      </svg>
    ),
    content: [
      "Treat every downed power line as live and lethal — always. Even if it is not sparking or glowing, it may still carry a full electrical charge. There is no safe way to visually confirm a line is de-energized.",
      "Stay at least 30 feet away from any downed line and keep others back. Electricity can arc through the air and travel through the ground outward from the point of contact — you do not have to touch the wire to be electrocuted.",
      "If a power line falls on your car: stay inside. Your vehicle acts as a protective shell. The rubber tires provide some insulation, but more importantly, staying inside keeps you from becoming the path electricity travels to the ground. Exiting the vehicle creates that path through your body.",
      "If you must exit a vehicle with a downed line on it — only do so if there is an immediate life threat like fire — jump clear of the vehicle with both feet together and land without touching the car and the ground at the same time. Then shuffle or hop away in small steps. Do not run.",
      "Shuffle, do not run, when moving away from a downed line. Electricity spreads through the ground in concentric rings called step potential — the voltage difference between your two feet while walking can be enough to cause electrocution. Keeping feet together minimizes that difference.",
      "Never attempt to move a downed line with any object, including wood or rubber-handled tools. Standard household tools are not rated for high-voltage lines.",
      "Call 9-1-1 immediately. Alert others and keep bystanders far back. Do not assume the utility company has been notified — report it yourself.",
      "Do not approach someone who is in contact with a live wire to help them — you will become a victim too. Wait for emergency responders with proper equipment.",
    ],
  },
  {
    title: "Seat Belt Safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
    content: [
      "Wear your seat belt on every trip, every time — no exceptions. Most fatal crash victims are unrestrained. A seat belt takes two seconds to buckle and can mean the difference between walking away and not.",
      "Seat belts work by spreading crash forces across the strongest parts of your body — the chest, hips, and pelvis — and keeping you inside the vehicle. Without one, you become a projectile traveling at the speed the car was going at impact.",
      "In a rollover, an unbelted occupant is 23 times more likely to be ejected from the vehicle. Being ejected is almost always fatal — the ground, other vehicles, and the car itself all become lethal hazards.",
      "Airbags are designed to work with seat belts, not replace them. An airbag deploying without a seat belt can cause serious injury or death on its own — the force of deployment is extreme.",
      "The back seat is not safer without a belt. Rear passengers who are unrestrained can be thrown forward at full crash velocity, injuring or killing both themselves and front seat occupants.",
      "Children must be in age- and size-appropriate car seats or booster seats. A child who has outgrown a rear-facing seat should be forward-facing, then in a booster, then a seat belt — follow manufacturer weight and height limits precisely.",
      "A properly worn belt sits low and flat across the hip bones — not the stomach — and the shoulder strap crosses the chest and collarbone, not the neck. An improperly worn belt can cause serious internal injuries in a crash.",
    ],
  },
  {
    title: "Driving Under the Influence",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
    content: [
      "Driving under the influence of alcohol, drugs, or any impairing substance is one of the leading causes of traffic fatalities in the United States. It is entirely preventable — every single time.",
      "Alcohol impairs reaction time, depth perception, judgment, and coordination — all critical to safe driving. At a BAC of 0.08% (the legal limit), your crash risk is already significantly elevated. Impairment begins well before that threshold.",
      "There is no safe amount of alcohol before driving for everyone. Body weight, food intake, medications, and individual metabolism all affect how alcohol hits. Do not rely on how you feel — impairment affects your ability to accurately assess your own impairment.",
      "Drugs — including marijuana, prescription medications, and over-the-counter sleep aids — can impair driving just as dangerously as alcohol. Legal does not mean safe to drive on.",
      "If you plan to drink, plan your ride before you drink. Designate a sober driver, use a rideshare app, or call someone. No destination is worth a life.",
      "If you see an impaired driver on the road, do not attempt to intervene or follow them. Pull over safely and call 9-1-1. Describe the vehicle, direction of travel, and location.",
      "As a community, we respond to the consequences of impaired driving — the crashes, the injuries, the fatalities. We have seen firsthand what it costs. Please make the call, take the ride, and get home safe.",
    ],
  },
  {
    title: "Nuclear / Radiological Preparedness",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm.87-5.74l-.9.92C11.45 12.69 11 13.5 11 15H9c0-1.86.75-3.35 1.96-4.54l1.24-1.26c.37-.36.6-.86.6-1.4 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.26z" />
      </svg>
    ),
    content: [
      "In the event of a nuclear incident: get inside a sturdy building immediately and stay there.",
      "Shut all windows, doors, and fireplace dampers. Turn off ventilation systems that draw in outside air.",
      "Stay tuned to emergency alerts for guidance from local and federal authorities.",
      "Do not go outside until officials say it is safe. Avoid contaminated surfaces and fallout.",
      "If exposed: remove outer clothing, shower with soap and water, change into clean clothes immediately.",
    ],
  },
];

export default function CommunityEducationPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-24 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Outreach &amp; Education</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Community<br />Education
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Millstadt Ambulance Service is committed to building a safer, more prepared community
            through education, outreach, and direct engagement.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#040d1a]" />

      {/* Outreach Section */}
      <section className="pb-28 bg-[#040d1a]">
        <div className="wrap grid md:grid-cols-2 gap-20 items-center">
          <div className="relative h-[460px] rounded-2xl overflow-hidden">
            <Image
              src="/images/millstadt-ems/lifeline.jpg"
              alt="Millstadt EMS unit 3926 on scene"
              fill
              className="object-cover object-top"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[#f0b429]" />
              <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">In the Community</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-8 leading-tight">
              We Come to You
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-5">
              From school visits and birthday party ambulance appearances to public safety
              demonstrations — community engagement is at the heart of who we are.
            </p>
            <p className="text-slate-400 text-base leading-relaxed mb-10">
              Our crews are available for community events, school visits, public safety programming, health and wellness appearances, and EMS standby coverage for athletic events and public gatherings across the Millstadt area. A safer community starts with education.
            </p>
            <div className="flex flex-col gap-4 max-w-sm">
              <Link
                href="/forms/event-request"
                className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
              >
                Request a Visit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Interactive Tools */}
      <section className="pb-24 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Interactive Tools</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-14">Reference Tools</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/community-education/stroke-tool"
              className="group flex flex-col gap-6 p-10 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
              </div>
              <div>
                <div className="text-white font-black text-xl mb-2 group-hover:text-[#f0b429] transition-colors">BE-FAST Stroke Recognition</div>
                <p className="text-slate-400 text-sm leading-relaxed">Interactive step-by-step visual guide to recognizing stroke warning signs using the BE-FAST method.</p>
              </div>
              <div className="flex items-center gap-2 text-[#f0b429] text-sm font-bold mt-auto">
                Open Tool
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </div>
            </Link>
            <Link
              href="/community-education/vitals"
              className="group flex flex-col gap-6 p-10 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center shrink-0 text-[#f0b429]">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /></svg>
              </div>
              <div>
                <div className="text-white font-black text-xl mb-2 group-hover:text-[#f0b429] transition-colors">Vital Signs Reference Tool</div>
                <p className="text-slate-400 text-sm leading-relaxed">Enter vital sign values — blood pressure, heart rate, temperature, oxygen saturation, and more — and see how they compare to standard reference ranges.</p>
              </div>
              <div className="flex items-center gap-2 text-[#f0b429] text-sm font-bold mt-auto">
                Open Tool
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-[#071428]" />

      {/* Safety Topics */}
      <section className="pb-24 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Safety Guides</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-14">Public Safety Education</h2>

          <div className="space-y-6">
            {safetyTopics.map((topic) => (
              <details
                key={topic.title}
                className="group rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/20 transition-colors overflow-hidden"
              >
                <summary className="flex items-center gap-6 p-10 cursor-pointer list-none select-none">
                  <div className="w-14 h-14 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0 text-[#f0b429]">
                    {topic.icon}
                  </div>
                  <span className="text-white font-bold text-xl flex-1">{topic.title}</span>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-slate-600 group-open:rotate-180 transition-transform duration-200 shrink-0">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </summary>
                <div className="px-10 pb-10 pt-2 border-t border-white/5">
                  <ul className="space-y-5 mt-6">
                    {topic.content.map((line, i) => (
                      <li key={i} className="flex items-start gap-4 text-slate-300 text-base leading-relaxed">
                        <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={16} height={16} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 2px #f0b429)" }} />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {topic.title === "Recognizing a Stroke — BE-FAST" && (
                    <div className="mt-10">
                      <Link
                        href="/community-education/stroke-tool"
                        className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d4a020] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
                      >
                        Open Interactive BE-FAST Assessment Tool →
                      </Link>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* Photo Strip */}
      <section className="pb-0 bg-[#040d1a]">
        <div className="wrap grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { src: "/images/millstadt-ems/IMG_3131.jpeg", pos: "object-center" },
            { src: "/images/millstadt-ems/community24.jpg", pos: "object-center" },
            { src: "/images/millstadt-ems/community33.jpg", pos: "object-center" },
            { src: "/images/millstadt-ems/IMG_5324.jpeg", pos: "object-left-top" },
          ].map((photo, i) => (
            <div key={i} className="relative h-56 rounded-xl overflow-hidden">
              <Image src={photo.src} alt={`Community outreach ${i + 1}`} fill className={`object-cover ${photo.pos} hover:scale-105 transition-transform duration-500`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* CTA */}
      <section className="pb-40 bg-[#071428]">
        <div className="wrap flex flex-col items-center text-center gap-8">
          <h2 className="text-4xl font-black text-white">Schedule a Visit or Event</h2>
          <p className="text-slate-400 text-lg max-w-xl">We&apos;re available for school visits, birthday parties, safety demos, and more.</p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Link
              href="/forms/event-request"
              className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
            >
              Request an Event
            </Link>
            <Link
              href="/forms/birthday"
              className="flex items-center justify-center w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
            >
              Birthday Party Request
            </Link>
          </div>
          <p className="text-slate-500 text-sm max-w-md">
            When staffing allows, we&apos;re happy to host your birthday party at the station for a small fee — a memorable experience for kids and families alike.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#071428]" />
    </>
  );
}
