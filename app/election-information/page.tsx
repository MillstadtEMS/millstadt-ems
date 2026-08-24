import type { Metadata } from "next";
import Image from "next/image";
import {
  Building2,
  ExternalLink,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";
import styles from "./ElectionInformation.module.css";

const COUNTY_VOTER_RESOURCES =
  "https://www.co.st-clair.il.us/departments/county-clerk/elections/voter-resources";
const COUNTY_MOBILE_RESOURCES =
  "https://vr.platinumvrms.com/county/RSLRequest/6?t=0";
const COUNTY_VOTE_BY_MAIL =
  "https://www.co.st-clair.il.us/departments/county-clerk/elections/vote-by-mail-information";
const ILLINOIS_VOTE_BY_MAIL =
  "https://www.elections.il.gov/electionoperations/VotingByMail.aspx";

export const metadata: Metadata = {
  title: "Election Information",
  description:
    "Plain-language links for St. Clair County voter registration, polling places, sample ballots, and Vote-by-Mail requests.",
};

const voterTools = [
  {
    title: "Check your registration",
    description: "Make sure your name and address are correct before you vote.",
    icon: UserCheck,
  },
  {
    title: "Find your polling place",
    description: "See where you can vote in person on Election Day.",
    icon: MapPin,
  },
  {
    title: "View your ballot information",
    description: "See your sample ballot when the county makes it available.",
    icon: FileText,
  },
  {
    title: "Request a ballot by mail",
    description: "Ask the county to send an eligible ballot to you by mail.",
    icon: Mail,
  },
  {
    title: "Find your elected officials",
    description: "See which elected offices represent your voting address.",
    icon: Building2,
  },
];

export default function ElectionInformationPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <p className={styles.eyebrow}>St. Clair County voter resources</p>
            <h1 className={styles.title}>Election Information</h1>
            <p className={styles.intro}>
              Use the official county website to check your voter registration,
              find your polling place, view ballot information, or ask for a
              Vote-by-Mail ballot.
            </p>
            <div className={styles.neutralNote}>
              <ShieldCheck aria-hidden size={23} />
              <p>
                This page shares voter information only. It does not support or
                oppose any candidate, political party, or ballot question.
              </p>
            </div>
          </div>

          <aside className={styles.officialCard} aria-labelledby="official-site-heading">
            <p className={styles.officialLabel}>Start at the official site</p>
            <h2 id="official-site-heading">St. Clair County Voter Resources</h2>
            <p>The County Clerk provides these voter tools.</p>
            <p className={styles.url}>{COUNTY_VOTER_RESOURCES}</p>
            <a
              className={styles.primaryLink}
              href={COUNTY_VOTER_RESOURCES}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open official voter resources
              <ExternalLink aria-hidden size={18} />
            </a>
          </aside>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="tools-heading">
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle} id="tools-heading">
            What you can do
          </h2>
          <p className={styles.sectionIntro}>
            The county puts these tools together on one page.
          </p>
          <div className={styles.resourceGrid}>
            {voterTools.map(({ title, description, icon: Icon }) => (
              <article className={styles.resourceCard} key={title}>
                <div className={styles.resourceIcon} aria-hidden="true">
                  <Icon size={24} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.sitePreview}>
            <h2 className={styles.sectionTitle}>What the county page looks like</h2>
            <p className={styles.sectionIntro}>
              Look for the St. Clair County name and the voter-tool tabs. The
              county may update the page after this picture was taken.
            </p>
            <figure className={styles.sitePreviewFigure}>
              <a
                href="/images/election-information/st-clair-county-voter-resources-site.webp"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open a larger screenshot of the St. Clair County Voter Resources website"
              >
                <Image
                  className={styles.guideImage}
                  src="/images/election-information/st-clair-county-voter-resources-site.webp"
                  alt="Screenshot of the official St. Clair County Voter Resources website showing the voter information lookup tool"
                  width={3644}
                  height={2206}
                  sizes="(max-width: 800px) calc(100vw - 2rem), 1200px"
                />
              </a>
              <figcaption>
                Tap the picture to make it larger. To use the voter tools,{" "}
                <a
                  href={COUNTY_VOTER_RESOURCES}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  click here to open the official county website
                </a>
                .
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="mail-heading">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Simple steps</p>
          <h2 className={styles.sectionTitle} id="mail-heading">
            How to request a Vote-by-Mail ballot
          </h2>
          <p className={styles.sectionIntro}>
            The request is made on the county&apos;s voter website, not on the
            Millstadt EMS website.
          </p>

          <ol className={styles.steps}>
            <li className={styles.step}>
              <div>
                <h3>Open the county&apos;s Voter Resources page.</h3>
                <p>This link opens the official St. Clair County website.</p>
                <a
                  className={styles.highlightLink}
                  href={COUNTY_VOTER_RESOURCES}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here to open the official page
                  <ExternalLink aria-hidden size={18} />
                </a>
              </div>
            </li>

            <li className={styles.step}>
              <div>
                <h3>On a phone, use the mobile-friendly page if needed.</h3>
                <p>
                  The county says its voter tool may work better on the separate
                  mobile page. The county link opens a site run by its voter-tool provider.
                </p>
                <a
                  className={styles.secondaryLink}
                  href={COUNTY_MOBILE_RESOURCES}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Smartphone aria-hidden size={18} />
                  Open the mobile-friendly version
                </a>
                <p>The county also says the Voter Resources page works best in Google Chrome.</p>
              </div>
            </li>

            <li className={styles.step}>
              <div>
                <h3>Enter your name.</h3>
                <p>
                  Enter your first and last name as they appear on your voter
                  information. If you have more than one last name, the county
                  tool says to enter only your first last name.
                </p>
              </div>
            </li>

            <li className={styles.step}>
              <div>
                <h3>Enter one form of identification.</h3>
                <p>Use either:</p>
                <ul>
                  <li>the last four digits of your Social Security number, or</li>
                  <li>your driver&apos;s license number.</li>
                </ul>
              </div>
            </li>

            <li className={styles.step}>
              <div>
                <h3>Select “Submit Request.”</h3>
                <p>Read the county&apos;s next screen and follow its instructions.</p>
              </div>
            </li>
          </ol>

          <figure className={styles.guideFigure}>
            <a
              href="/images/election-information/st-clair-county-vote-by-mail-guide.webp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open a larger copy of the St. Clair County Vote-by-Mail guide"
            >
              <Image
                className={styles.guideImage}
                src="/images/election-information/st-clair-county-vote-by-mail-guide.webp"
                alt="A six-step visual guide showing how to request a Vote-by-Mail ballot in St. Clair County"
                width={2752}
                height={1536}
                sizes="(max-width: 800px) calc(100vw - 2rem), 1200px"
              />
            </a>
            <figcaption>
              Quick visual guide. Tap the image to open a larger copy. Use the
              written steps above for an easier-to-read phone version.
            </figcaption>
          </figure>

          <aside className={styles.helpBox}>
            <h3>What if the search does not work?</h3>
            <p>
              The county tool says to remove the last four digits of your Social
              Security number. Then enter your full driver&apos;s license or state ID
              number with no dashes and try again.
            </p>
          </aside>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="choices-heading">
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle} id="choices-heading">
            One election or future elections
          </h2>
          <p className={styles.sectionIntro}>
            St. Clair County has information for both choices.
          </p>
          <div className={styles.choiceGrid}>
            <article className={styles.choiceCard}>
              <h3>One-time request</h3>
              <p>
                You can ask for a Vote-by-Mail ballot for one election. Use the
                Voter Resources page and follow the request steps above.
              </p>
              <a
                className={styles.secondaryLink}
                href={COUNTY_VOTER_RESOURCES}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the request page
                <ExternalLink aria-hidden size={18} />
              </a>
            </article>

            <article className={styles.choiceCard}>
              <h3>Permanent Vote by Mail</h3>
              <p>
                Illinois voters may apply for permanent Vote-by-Mail status for
                eligible future elections. Read the county&apos;s instructions and
                application before you choose this option.
              </p>
              <a
                className={styles.secondaryLink}
                href={COUNTY_VOTE_BY_MAIL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the county information
                <ExternalLink aria-hidden size={18} />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="privacy-heading">
        <div className={styles.wrap}>
          <div className={styles.bottomGrid}>
            <article className={styles.privacyCard}>
              <h2 id="privacy-heading">
                <LockKeyhole aria-hidden size={25} /> Privacy reminder
              </h2>
              <p>The voter tool may ask for private information.</p>
              <ul>
                <li>Start on the official St. Clair County website.</li>
                <li>
                  The county&apos;s mobile link goes to its provider at
                  vr.platinumvrms.com.
                </li>
                <li>Do not put your ID numbers in comments or messages.</li>
                <li>Do not send your ID numbers to Millstadt EMS.</li>
              </ul>
            </article>

            <article className={styles.contactCard}>
              <h2>Need help?</h2>
              <p>Contact the St. Clair County Election Department.</p>
              <div className={styles.contactList}>
                <a className={styles.contactLink} href="tel:+16188252366">
                  <Phone aria-hidden size={20} />
                  618-825-2366
                </a>
                <a
                  className={styles.contactLink}
                  href="mailto:elections@stclaircountyil.gov"
                >
                  <Mail aria-hidden size={20} />
                  elections@stclaircountyil.gov
                </a>
                <a
                  className={styles.contactLink}
                  href={ILLINOIS_VOTE_BY_MAIL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Search aria-hidden size={20} />
                  Illinois Vote-by-Mail information
                  <ExternalLink aria-hidden size={16} />
                </a>
              </div>
            </article>
          </div>

          <p className={styles.disclaimer}>
            Millstadt Ambulance Service is sharing these links as a public
            service. Election rules, dates, and forms can change. The St. Clair
            County Clerk and the Illinois State Board of Elections are the
            official sources. This page does not advocate for or against any
            candidate, political party, or ballot question.
          </p>
        </div>
      </section>
    </main>
  );
}

