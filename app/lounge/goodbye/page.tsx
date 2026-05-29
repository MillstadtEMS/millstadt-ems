import Link from "next/link";

export default async function LoungeGoodbyePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawName = Array.isArray(params.name) ? params.name[0] : params.name;
  const name = rawName?.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim();

  return (
    <main className="goodbye-page">
      <style>{GOODBYE_CSS}</style>
      <section className="goodbye-card" aria-label="Signed out">
        <div className="goodbye-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/millstadt-ems/crest.png" alt="Millstadt EMS" className="goodbye-logo" />
          <span className="goodbye-wave" aria-hidden>
            👋
          </span>
        </div>
        <div className="goodbye-copy">
          <span>Signed out</span>
          <h1>{name ? `See ya next time, ${name}.` : "See ya next time."}</h1>
          <p>Your Employee Lounge session is closed.</p>
        </div>
        <Link href="/lounge/login" className="goodbye-button">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}

const GOODBYE_CSS = `
.goodbye-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  color: white;
  background:
    radial-gradient(900px 520px at 50% -10%, rgba(240,180,41,0.08), transparent 62%),
    radial-gradient(700px 420px at 50% 105%, rgba(37,99,235,0.16), transparent 62%),
    #040d1a;
}
.goodbye-card {
  width: min(100%, 430px);
  display: grid;
  justify-items: center;
  text-align: center;
  padding: 30px 24px 26px;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(7,20,40,0.84), rgba(2,9,18,0.92)),
    #071428;
  box-shadow:
    0 26px 70px rgba(0,0,0,0.42),
    inset 0 1px 0 rgba(255,255,255,0.08);
  animation: goodbye-card-in 460ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.goodbye-logo-wrap {
  position: relative;
  width: 238px;
  height: 238px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  filter:
    drop-shadow(0 18px 40px rgba(0,0,0,0.6))
    drop-shadow(0 0 50px rgba(60,120,255,0.40));
}
.goodbye-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: goodbye-logo-float 2600ms ease-in-out infinite;
}
.goodbye-wave {
  position: absolute;
  right: 16px;
  top: 24px;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: #f0b429;
  border: 2px solid rgba(255,255,255,0.74);
  color: #040d1a;
  font-size: 1.65rem;
  box-shadow: 0 16px 28px rgba(0,0,0,0.34);
  transform-origin: 70% 70%;
  animation: goodbye-wave 1200ms ease-in-out 240ms 3;
}
.goodbye-copy span {
  display: block;
  color: #f0b429;
  font-size: 0.7rem;
  font-weight: 950;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.goodbye-copy h1 {
  margin: 8px 0 0;
  color: white;
  font-size: clamp(1.8rem, 8vw, 2.65rem);
  line-height: 0.96;
  letter-spacing: -0.045em;
  font-weight: 950;
}
.goodbye-copy p {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 0.96rem;
  line-height: 1.5;
}
.goodbye-button {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 22px;
  border-radius: 13px;
  background: #f0b429;
  color: #040d1a;
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
@keyframes goodbye-card-in {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes goodbye-logo-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes goodbye-wave {
  0%, 100% { transform: rotate(0deg); }
  18% { transform: rotate(18deg); }
  36% { transform: rotate(-10deg); }
  54% { transform: rotate(16deg); }
  72% { transform: rotate(-6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .goodbye-card,
  .goodbye-logo,
  .goodbye-wave {
    animation: none;
  }
}
`;
