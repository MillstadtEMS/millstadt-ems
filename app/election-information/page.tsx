import type { Metadata } from "next";
import styles from "./ElectionInformation.module.css";
import ZoomableElectionImage from "./ZoomableElectionImage";

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

      <section
        className={[styles.section, styles.toolsSection].join(" ")}
        aria-labelledby="county-tools-heading"
      >
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

      <section
        className={[styles.section, styles.screenshotSection].join(" ")}
        aria-label="Voting picture guides"
      >
        <div className={styles.wrap}>
          <div className={styles.guideGallery}>
            <ZoomableElectionImage
              featured
              src="/images/election-information/st-clair-county-voting-guide.webp"
              alt="Six-step picture guide for requesting a Vote-by-Mail ballot in St. Clair County"
              width={2752}
              height={1536}
              title="Vote-by-Mail in six steps"
              caption="Open the county page. Find the request area. Enter your name and one ID number. Submit the request. Watch the mail."
            />

            <ZoomableElectionImage
              src="/images/election-information/st-clair-county-request-ballot-guide.webp"
              alt="Annotated picture of the St. Clair County Vote-by-Mail request form with numbered directions"
              width={1122}
              height={1402}
              title="County Vote-by-Mail form"
              caption="The numbers point to the mobile link, the name and ID boxes, and the Submit Request button."
            />

            <ZoomableElectionImage
              src="/images/election-information/st-clair-county-voter-tools-guide.webp"
              alt="St. Clair County voter resources guide showing registration, Vote-by-Mail, polling place, and elected-official tools"
              width={1122}
              height={1402}
              title="County voter resources"
              caption="Use the official page to check registration, find a polling place, see ballot information, and find elected officials."
            />
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
            <li>
              <strong>Watch your mail.</strong>
              If the county approves and processes the request, it will mail
              the ballot to the address connected to your voter registration.
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
          <div className={styles.optionGrid}>
            <div className={styles.optionItem}>
              <h3>One-time request</h3>
              <p>
                You can request a ballot by mail for one election using the
                county Voter Resources page.
              </p>
            </div>
            <div className={styles.optionItem}>
              <h3>Permanent Vote by Mail</h3>
              <p>
                Illinois voters may apply to receive eligible future ballots
                by mail. Read the county&apos;s information before choosing this
                option.
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
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="privacy-heading">
        <div className={styles.readingWidth}>
          <div className={styles.infoGrid}>
            <div>
              <h2 id="privacy-heading">Keep your information private</h2>
              <p>
                Only enter your Social Security, driver&apos;s license, or state ID
                information on the official county voter website. Do not put it
                in comments, send it through social media, or send it to
                Millstadt EMS.
              </p>
            </div>

            <div className={styles.helpBlock}>
              <h2>Need help?</h2>
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
            </div>
          </div>

          <p className={styles.footerNote}>
            Voting rules, dates, and forms can change. The St. Clair County
            Clerk and the Illinois State Board of Elections are the official sources.
          </p>
        </div>
      </section>
    </main>
  );
}
