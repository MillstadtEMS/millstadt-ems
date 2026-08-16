import type { Metadata } from "next";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { CommunityAreaSurvey, ManagePreferencesButton } from "./PrivacyControls";
import styles from "./PrivacyPage.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website Privacy and Analytics",
  description: "Website privacy and analytics notice for Millstadt Ambulance Service and Millstadt EMS.",
};

const ORGANIZATION_NAME = "Millstadt Ambulance Service / Millstadt EMS";

export default function PrivacyPage() {
  const config = getAnalyticsConfig();
  const contact = config.privacyContact;
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Millstadt Ambulance Service</p>
          <h1>Website privacy and analytics</h1>
          <p className={styles.lead}>
            {ORGANIZATION_NAME} may collect limited technical, security, operational, and usage information when this website is used.
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Information that may be collected</h2>
          <p>Depending on the feature used, information may include:</p>
          <ul>
            <li>requested pages or files;</li>
            <li>dates and times;</li>
            <li>browser and operating-system information;</li>
            <li>device category;</li>
            <li>referring page;</li>
            <li>page-performance information;</li>
            <li>security and error information;</li>
            <li>broad geographic information;</li>
            <li>aggregate document-use events;</li>
            <li>estimated returning-visitor activity; and</li>
            <li>information voluntarily submitted through a form.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How information is used</h2>
          <p>{ORGANIZATION_NAME} may use this information to:</p>
          <ul>
            <li>operate and secure the website;</li>
            <li>prevent abuse;</li>
            <li>improve accessibility and performance;</li>
            <li>understand aggregate website use;</li>
            <li>administer approved document access;</li>
            <li>investigate technical problems;</li>
            <li>maintain administrative records; and</li>
            <li>respond to submitted requests or reports.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Names and submitted information</h2>
          <p>
            {ORGANIZATION_NAME} does not identify anonymous visitors by name merely because they browse the website. Names and contact information may be collected when voluntarily submitted through an identified form or account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>No sale or targeted advertising</h2>
          <p>{ORGANIZATION_NAME} does not sell website visitor information and does not use website analytics for targeted advertising.</p>
          <p>{ORGANIZATION_NAME} does not use analytics to identify, harass, retaliate against, or publicly expose people who criticize the service, submit concerns, engage in journalism, or exercise lawful rights.</p>
          <p>{ORGANIZATION_NAME} does not create visitor watchlists, critic profiles, political-viewpoint profiles, or individual credibility scores.</p>
        </section>

        <section className={styles.section}>
          <h2>Returning-visitor estimates</h2>
          <p>{ORGANIZATION_NAME} may use a first-party browser identifier to estimate whether a browser has visited the website before. This information is used for aggregate website analytics and is not intended to identify a visitor by name, determine a visitor’s residence, or track activity across other websites.</p>
          <p>Returning-visitor estimates may be inaccurate because visitors may use multiple devices, share devices, delete cookies, use private browsing, or decline optional analytics.</p>
        </section>

        <section className={styles.section}>
          <h2>Location</h2>
          <p>Ordinary website analytics do not determine a visitor’s exact residence. If {ORGANIZATION_NAME} activates an optional location feature, the website will provide a separate notice describing the purpose, precision, retention, access, and choices associated with that feature.</p>
          {config.communitySurveyEnabled ? (
            <>
              <h3>Optional community-area survey</h3>
              <p>The voluntary selection below does not request a name, email, account, or exact address. It is stored separately from browsing and identified forms, and is reported only in aggregate.</p>
              <CommunityAreaSurvey />
            </>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2>Retention and security</h2>
          <p>{ORGANIZATION_NAME} retains information according to configured retention periods and approved administrative policies. Security logs may be retained separately from aggregate analytics. Information is protected through access controls and reasonable security measures appropriate to the data involved.</p>
        </section>

        <section className={styles.section}>
          <h2>Service providers</h2>
          <p>{ORGANIZATION_NAME} identifies any service provider that processes website information and configures applicable privacy and security terms. Names, signatures, uploaded documents, medical information, and report narratives must not be sent to an analytics provider.</p>
        </section>

        <section className={styles.section}>
          <h2>Questions and preferences</h2>
          {contact ? (
            <p>
              For questions about this notice or the website’s information practices, contact:{" "}
              {contact.includes("@") ? <a className={styles.contact} href={`mailto:${contact}`}>{contact}</a> : <span className={styles.contact}>{contact}</span>}
            </p>
          ) : (
            <p className={styles.note}>
              The website privacy contact has not been configured. Optional analytics remain disabled until the required production configuration and review are complete.
            </p>
          )}
          <ManagePreferencesButton />
        </section>
      </div>
    </main>
  );
}
