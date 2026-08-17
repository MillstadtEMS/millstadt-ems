import Image from "next/image";
import { Dancing_Script } from "next/font/google";

const prayerFont = Dancing_Script({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

export default function SerenityPrayer() {
  return (
    <section
      aria-labelledby="serenity-prayer-heading"
      className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden bg-[#071428] px-6 py-20 sm:min-h-[740px] sm:py-24 lg:min-h-[780px]"
    >
      <Image
        src="/images/millstadt-ems/serenity-star-of-life-cross.png"
        alt=""
        aria-hidden="true"
        width={1600}
        height={1600}
        sizes="(max-width: 768px) 300px, 760px"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.28] sm:opacity-[0.24]"
        style={{ width: "clamp(300px, 72vw, 760px)" }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,20,40,0) 0%, rgba(7,20,40,0.12) 28%, rgba(4,13,26,0.42) 100%), radial-gradient(ellipse at center, rgba(7,20,40,0.18) 0%, rgba(7,20,40,0.48) 58%, rgba(7,20,40,0.82) 100%)",
        }}
      />

      <div className="relative z-20 mx-auto flex max-w-5xl flex-col items-center text-center">
        <div className="mb-10 flex w-full items-center justify-center gap-5 sm:mb-12" aria-hidden="true">
          <span className="h-px w-full max-w-36 bg-gradient-to-r from-transparent to-[#f0b429]/70" />
          <span className="h-3 w-3 rotate-45 border border-[#f0b429]/80" />
          <span className="h-px w-full max-w-36 bg-gradient-to-l from-transparent to-[#f0b429]/70" />
        </div>

        <h2 id="serenity-prayer-heading" className="sr-only">
          Serenity Prayer
        </h2>

        <blockquote className="m-0 w-full">
          <p
            aria-label="God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference."
            className={`${prayerFont.className} mx-auto max-w-5xl text-balance text-[clamp(1.85rem,8vw,3.5rem)] font-bold leading-[1.04] text-[#fff7df] sm:text-[clamp(2.2rem,4.9vw,4.85rem)] sm:leading-[1.08]`}
          >
            <span aria-hidden="true" className="block">God, grant me the serenity</span>
            <span aria-hidden="true" className="mt-2 block sm:mt-4">to accept the things I cannot change,</span>
            <span aria-hidden="true" className="mt-2 block sm:mt-4">the courage to change the things I can,</span>
            <span aria-hidden="true" className="mt-2 block sm:mt-4">and the wisdom to know the difference.</span>
          </p>
          <cite className="mt-6 block text-xs font-black uppercase not-italic tracking-[0.28em] text-[#f0b429] sm:mt-8 sm:text-sm">
            Serenity Prayer
          </cite>
        </blockquote>
      </div>
    </section>
  );
}
