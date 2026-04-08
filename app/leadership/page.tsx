import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leadership",
  description:
    "Meet the leadership team of Millstadt Ambulance Service — EMS Chief Jennifer Goetz and Assistant Chief of Operations Kenneth James.",
};

const leaders = [
  {
    name: "Jennifer Goetz",
    title: "EMS Chief",
    since: "Serving since 2024",
    img: "/images/millstadt-ems/jennifer-goetz.png",
    imgSide: "left" as const,
    credentials: ["RN, BSN", "EMT", "PHRN", "CCRN (in progress)"],
    bio: [
      "Jennifer Goetz serves as EMS Chief of Millstadt Ambulance Service, a role she assumed in October 2024. A lifelong resident of Millstadt, she brings a deep connection to the community along with nearly three decades of experience in healthcare and emergency medical services.",
      "Jennifer has over 28 years of experience as a Registered Nurse and 16 years of service as an EMT with Millstadt Ambulance Service. Her clinical background spans a wide range of specialties, including medical-surgical, rehabilitation, telemetry, intensive care, post-anesthesia care, and emergency nursing. This diverse experience allows her to provide well-rounded leadership and advanced clinical insight in both prehospital and hospital-based care.",
      "She earned her Associate Degree in Nursing from Southwestern Illinois College and her Bachelor of Science in Nursing from Saint Louis University. Continuing her commitment to advancing patient care, Jennifer has obtained her Pre-Hospital Registered Nurse (PHRN) credential, allowing her to remain active in the field while serving in a leadership role. She is currently pursuing her Critical Care Registered Nurse (CCRN) certification to further expand the level of care available to the community.",
      "As EMS Chief, Jennifer oversees the day-to-day operations of the ambulance service, including personnel management, training, scheduling, and resource allocation. She ensures crews are prepared to deliver high-quality care in the field while maintaining operational readiness and efficiency. Her leadership supports a culture of accountability, professionalism, and continuous improvement within the organization.",
      "Jennifer also works closely with regional healthcare partners and the EMS system to ensure alignment with established clinical guidelines and seamless continuity of care from the field to the hospital. She is actively involved in community outreach and education, promoting public awareness, safety, and emergency preparedness.",
      "Her leadership reflects a balance of clinical experience, operational knowledge, and a strong commitment to the community she serves.",
    ],
  },
  {
    name: "Kenneth James",
    title: "Assistant Chief of Operations",
    since: "Serving since 2015",
    img: "/images/millstadt-ems/kenneth-james.png",
    imgSide: "right" as const,
    credentials: ["NRP", "CCP-C", "FP-C", "TP-C", "BSN (in progress)", "MS — Public Safety Administration"],
    bio: [
      "Kenneth James serves as Assistant Chief of Operations for Millstadt Ambulance Service, where he has been a paramedic since November 2015. With a strong background in both clinical care and leadership, he plays a key role in supporting the day-to-day operations of the organization and ensuring the service remains responsive, efficient, and forward-thinking.",
      "Kenneth holds advanced credentials as a Critical Care Paramedic, Flight Paramedic, and Tactical Paramedic, reflecting a broad and specialized skill set in high-acuity and complex environments. His experience extends beyond Millstadt, having served with several neighboring EMS agencies and as a paramedic with the St. Louis Fire Department, where he gained valuable experience in high-volume urban emergency response.",
      "He earned his Associate Degree in Paramedicine from Southwestern Illinois College, a Bachelor of Science in Public Safety Management from Southern Illinois University Carbondale, and a Master of Science in Public Safety Administration from Southern Illinois University Carbondale. He is currently in his final year of completing a Bachelor of Science in Nursing at Chamberlain University, further expanding his clinical foundation and scope of knowledge.",
      "In his role as Assistant Chief of Operations, Kenneth oversees key operational functions including personnel management, training, scheduling, and resource coordination, working closely with the EMS Chief to maintain a high standard of service delivery. In addition to his operational responsibilities, he leads many of the organization's technical and IT initiatives, including development and management of the agency's website and implementation of technology systems that enhance efficiency, communication, and patient care documentation.",
      "Kenneth brings a combination of field experience, administrative leadership, and technical expertise to the organization, contributing to the continued growth and modernization of Millstadt Ambulance Service.",
    ],
  },
];

export default async function LeadershipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isPreview = params?.preview === "ve";

  const [
    leadershipTitle, leadershipSubtitle,
    chiefName, chiefTitle, chiefSince,
    asstName, asstTitle, asstSince,
  ] = await Promise.all([
    getContent("leadership.header.title",    "Leadership",                      isPreview),
    getContent("leadership.header.subtitle", "The people guiding Millstadt Ambulance Service — bringing decades of clinical experience, operational expertise, and a commitment to the community.", isPreview),
    getContent("leadership.chief.name",      "Jennifer Goetz",                  isPreview),
    getContent("leadership.chief.title",     "EMS Chief",                       isPreview),
    getContent("leadership.chief.since",     "Serving since 2024",              isPreview),
    getContent("leadership.asst-chief.name", "Kenneth James",                   isPreview),
    getContent("leadership.asst-chief.title","Assistant Chief of Operations",   isPreview),
    getContent("leadership.asst-chief.since","Serving since 2015",              isPreview),
  ]);

  // Merge DB values into leaders array
  const resolvedLeaders = [
    { ...leaders[0], name: chiefName,  title: chiefTitle,  since: chiefSince  },
    { ...leaders[1], name: asstName,   title: asstTitle,   since: asstSince   },
  ];

  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Millstadt Ambulance Service</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            {leadershipTitle}
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">{leadershipSubtitle}</p>
        </div>
      </section>

      {/* Leaders */}
      {resolvedLeaders.map((leader, index) => (
        <div key={leader.name}>
          {index > 0 && (
            <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />
          )}

          <section className={`py-28 ${index % 2 === 0 ? "bg-[#040d1a]" : "bg-[#071428]"}`}>
            <div className="wrap">
              <div className={`grid md:grid-cols-2 gap-20 items-start ${leader.imgSide === "right" ? "direction-rtl" : ""}`}>

                {/* Photo */}
                <div className={`${leader.imgSide === "right" ? "md:order-2" : ""}`}>
                  <div className="relative w-full aspect-square">
                    {/* Clip image to circle */}
                    <div className="absolute inset-0" style={{ clipPath: "circle(50%)" }}>
                      <Image
                        src={leader.img}
                        alt={leader.name}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    {/* Cover the black ring baked into the photo */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        boxShadow: `inset 0 0 0 22px ${index % 2 === 0 ? "#040d1a" : "#071428"}`,
                      }}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className={`${leader.imgSide === "right" ? "md:order-1" : ""}`}>
                  <div className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase mb-3">
                    {leader.since}
                  </div>
                  <h2 className="text-white font-black text-5xl mb-2 leading-tight">
                    {leader.name}
                  </h2>
                  <p className="text-slate-500 text-lg font-bold mb-10 tracking-wide">
                    {leader.title}
                  </p>

                  <ul className="space-y-6">
                    {leader.bio.map((para, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <Image
                          src="/images/millstadt-ems/star-of-life.png"
                          alt=""
                          width={20}
                          height={20}
                          className="shrink-0 mt-1"
                          style={{ filter: "drop-shadow(0 0 3px #2563eb)" }}
                        />
                        <p className="text-slate-400 text-base leading-relaxed">{para}</p>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          </section>
        </div>
      ))}

      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
    </>
  );
}
