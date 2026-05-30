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
        </div>
        <div className="goodbye-copy">
          <span>Signed out</span>
          <h1>{name ? `See ya later, ${name}.` : "See ya later."}</h1>
          <p>Your Employee Lounge session is closed.</p>
        </div>
        <div className="goodbye-actions">
          <Link href="/lounge/login" className="goodbye-button is-primary">
            Back to sign in
          </Link>
          <Link href="/" className="goodbye-button is-secondary">
            Click here to head back to MillstadtEMS.org
          </Link>
        </div>
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
  width: 200px;
  height: 200px;
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
  font-size: clamp(1.8rem, 8vw, 2.5rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  font-weight: 950;
}
.goodbye-copy p {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.5;
}
.goodbye-actions {
  display: grid;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}
.goodbye-button {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  transition: transform 120ms ease-out, filter 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out;
}
.goodbye-button.is-primary {
  background: #f0b429;
  color: #040d1a;
  font-size: 0.84rem;
}
.goodbye-button.is-primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.goodbye-button.is-secondary {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(255,255,255,0.16);
  padding: 0 14px;
  font-size: 0.72rem;
  text-align: center;
  line-height: 1.2;
}
.goodbye-button.is-secondary:hover {
  background: rgba(255,255,255,0.04);
  color: white;
  border-color: rgba(255,255,255,0.28);
}
@keyframes goodbye-card-in {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes goodbye-logo-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@media (prefers-reduced-motion: reduce) {
  .goodbye-card,
  .goodbye-logo {
    animation: none;
  }
}
`;
