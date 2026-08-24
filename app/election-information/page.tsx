import type { Metadata } from "next";
import Image from "next/image";
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
    "Official St. Clair County links for voter registration, polling places, sample ballots, and Vote-by-Mail requests.",
};

export default function ElectionInformationPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.wrap}>
          <p className={styles.kicker}>St. Clair County voting information</p>
          <h1>Voting in St. Clair County</h1>
          <p className={styles.lead}>
            Use the official St. Clair County Clerk website to check your
            registration, find your polling place, see ballot information, or
            request a ballot by mail.
          </p>
          <a
            className={styles.mainLink}
            href={COUNTY_VOTER_RESOURCES}
            target="_blank"
            rel="noopener noreferrer"
          >
            Click here: Official County Voter Resources
          </a>
          <p className={styles.printedUrl}>{COUNTY_VOTER_RESOURCES}</p>
          <p className={styles.neutralStatement}>
            This page provides voting information only. It does not support or
            oppose any candidate, party, or ballot question.
          </p>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="county-tools-heading">
        <div className={styles.readingWidth}>
          <h2 id="county-tools-heading">What you can find on the county website</h2>
          <ul className={styles.plainList}>
            <li>Check whether you are registered to vote.</li>
            <li>Find your Election Day polling place.</li>
            <li>View a sample ballot when one is available.</li>
            <li>Request a Vote-by-Mail ballot.</li>
            <li>Find the elected officials for your address.</li>
          </ul>
        </div>
      </section>

      <section className={[styles.section, styles.screenshotSection].join(" ")} aria-labelledby="screenshots-heading">
        <div className={styles.wrap}>
          <div className={styles.readingWidthNoMargin}>
            <h2 id="screenshots-heading">What the official website looks like</h2>
            <p>
              These are pictures of the real St. Clair County website. The
              county may change its page after these pictures are taken.
            </p>
          </div>

          <div className={styles.screenshotGrid}>
            <figure className={styles.screenshotFigure}>
              <a
                href="/images/election-information/st-clair-county-voter-resources-current.webp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/election-information/st-clair-county-voter-resources-current.webp"
                  alt="The official St. Clair County Voter Resources page showing the mobile link and Vote-by-Mail request form"
                  width={1440}
                  height={1772}
                  sizes="(max-width: 800px) calc(100vw - 2rem), 720px"
                />
              </a>
              <figcaption>
                The county page shows a Mobile Friendly Version link and the
                Vote-by-Mail request form. Tap the picture to make it larger.
              </figcaption>
            </figure>

            <figure className={styles.screenshotFigure}>
              <a
                href="/images/election-information/st-clair-county-voter-resources-site.webp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/election-information/st-clair-county-voter-resources-site.webp"
                  alt="The official St. Clair County voter website showing the address lookup and sample ballot tool"
                  width={3644}
                  height={2206}
                  sizes="(max-width: 800px) calc(100vw - 2rem), 720px"
                />
              </a>
              <figcaption>
                The Address Lookup tab can show your polling place, ballot, and
                elected officials. Tap the picture to make it larger.
              </figcaption>
            </figure>
          </div>

          <p className={styles.belowPictures}>
            Pictures are for help only. To enter your information, use the{" "}
            <a href={COUNTY_VOTER_RESOURCES} target="_blank" rel="noopener noreferrer">
              official St. Clair County website
            </a>
            .
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mail-heading">
        <div className={styles.readingWidth}>
          <h2 id="mail-heading">How to request a ballot by mail</h2>
          <p>
            You make the request on the county website. Millstadt EMS does not
            collect your voter information.
          </p>

          <ol className={styles.steps}>
            <li>
              <strong>Open the official Voter Resources page.</strong>
              <a href={COUNTY_VOTER_RESOURCES} target="_blank" rel="noopener noreferrer">
                Click here to open it
              </a>
              .
            </li>
            <li>
              <strong>On a phone, tap “Mobile Friendly Version” if needed.</strong>
              The county also says the page works best in Google Chrome.{" "}
              <a href={COUNTY_MOBILE_RESOURCES} target="_blank" rel="noopener noreferrer">
                Open the mobile version
              </a>
              .
            </li>
            <li>
              <strong>Enter your first and last name.</strong>
              Use the name shown on your voter information. If you have more
              than one last name, the county says to enter only your first last name.
            </li>
            <li>
              <strong>Enter one ID number.</strong>
              Use either the last four digits of your Social Security number or
              your driver&apos;s license number.
            </li>
            <li>
              <strong>Select “Submit Request.”</strong>
              Read the next screen and follow the county&apos;s instructions.
            </li>
          </ol>

          <div className={styles.note}>
            <h3>If the search does not work</h3>
            <p>
              Remove the last four digits of your Social Security number. Enter
              your full driver&apos;s license or state ID number with no dashes,
              then try again.
            </p>
          </div>
        </div>
      </section>

      <section className={[styles.section, styles.optionsSection].join(" ")} aria-labelledby="mail-options-heading">
        <div className={styles.readingWidth}>
          <h2 id="mail-options-heading">One election or future elections</h2>
          <h3>One-time request</h3>
          <p>
            You can request a ballot by mail for one election using the county
            Voter Resources page.
          </p>
          <h3>Permanent Vote by Mail</h3>
          <p>
            Illinois voters may apply to receive eligible future ballots by
            mail. Read the county&apos;s information before choosing this option.
          </p>
          <a
            className={styles.textLink}
            href={COUNTY_VOTE_BY_MAIL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the county&apos;s Vote-by-Mail information
          </a>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="privacy-heading">
        <div className={styles.readingWidth}>
          <h2 id="privacy-heading">Keep your information private</h2>
          <p>
            Only enter your Social Security, driver&apos;s license, or state ID
            information on the official county voter website. Do not put it in
            comments, send it through social media, or send it to Millstadt EMS.
          </p>

          <h2 className={styles.helpHeading}>Need help?</h2>
          <p>Contact the St. Clair County Election Department:</p>
          <ul className={styles.contactList}>
            <li><a href="tel:+16188252366">618-825-2366</a></li>
            <li><a href="mailto:elections@stclaircountyil.gov">elections@stclaircountyil.gov</a></li>
            <li>
              <a href={ILLINOIS_VOTE_BY_MAIL} target="_blank" rel="noopener noreferrer">
                Illinois Vote-by-Mail information
              </a>
            </li>
          </ul>

          <p className={styles.footerNote}>
            Voting rules, dates, and forms can change. The St. Clair County
            Clerk and the Illinois State Board of Elections are the official sources.
          </p>
        </div>
      </section>
    </main>
  );
}
