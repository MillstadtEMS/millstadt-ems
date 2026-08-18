import Image from "next/image";
import { serenityScript } from "@/app/fonts";

export default function SerenityPrayer() {
  return (
    <section
      id="serenity-prayer"
      aria-labelledby="serenity-prayer-heading"
      className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden bg-[#071428] px-6 py-20 sm:min-h-[740px] sm:py-24 lg:min-h-[780px]"
    >
      <Image
        src="/images/millstadt-ems/serenity-star-of-life-cross.png"
        alt=""
        aria-hidden="true"
        width={1600}
        height={1600}
        loading="eager"
        sizes="(max-width: 640px) 280px, 620px"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.54] sm:opacity-[0.5]"
        style={{ width: "clamp(280px, 64vw, 620px)" }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,20,40,0) 0%, rgba(7,20,40,0.08) 48%, rgba(4,13,26,0.24) 100%), radial-gradient(ellipse at center, rgba(7,20,40,0.08) 0%, rgba(7,20,40,0.28) 62%, rgba(7,20,40,0.56) 100%)",
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
            className={`${serenityScript.className} mx-auto max-w-5xl text-balance text-[clamp(1.85rem,8vw,3.5rem)] font-bold leading-[1.04] text-[#fff7df] sm:text-[clamp(2.2rem,4.9vw,4.85rem)] sm:leading-[1.08]`}
            style={{
              textShadow:
                "0 2px 8px rgba(4,13,26,0.98), 0 0 22px rgba(4,13,26,0.9)",
            }}
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

        <div
          className="mt-12 flex w-full max-w-2xl items-center justify-center gap-4 sm:mt-14 sm:gap-6"
          aria-label="In God We Trust"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#f0b429]/60" aria-hidden="true" />
          <p
            className="shrink-0 text-center text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase leading-none text-[#fff7df]"
            style={{ textShadow: "0 2px 8px rgba(4,13,26,0.98)" }}
          >
            In God We Trust
          </p>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#f0b429]/60" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
