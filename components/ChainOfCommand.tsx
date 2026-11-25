import styles from "./ChainOfCommand.module.css";

const FIELD_PROVIDERS = [
  "First responders",
  "EMTs",
  "Paramedics",
  "Critical care providers",
  "Prehospital advanced practice registered nurses",
  "Prehospital physician assistants",
];

function Connector({ area, className = "" }: { area?: string; className?: string }) {
  return (
    <div className={`${styles.conn} ${className}`} style={area ? { gridArea: area } : undefined} aria-hidden="true">
      <i />
    </div>
  );
}

export default function ChainOfCommand() {
  return (
    <section
      id="chain-of-command"
      aria-labelledby="chain-of-command-title"
      className={`bg-[#071428] ${styles.section}`}
    >
      <div className="wrap">
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Organization
          </p>
          <h2 id="chain-of-command-title" className={styles.title}>
            Chain of Command
          </h2>
          <p className={styles.lede}>
            How Millstadt Ambulance Service is organized, from the residents it serves to the providers in the field.
          </p>
        </header>

        <figure className={styles.chart}>
          <figcaption className="sr-only">
            Residents in the Millstadt EMS service area lead to the Board of Directors, which leads to the EMS
            Co-Chiefs, Jennifer Goetz and Kenneth L. James Jr. The Co-Chiefs lead to the Training Officer, when
            assigned, who leads to the field providers. Separately, the Southwestern Illinois EMS System, through EMS
            Medical Director Leo Hsu, MD, provides medical oversight to the EMS Co-Chiefs.
          </figcaption>

          <div className={styles.top}>
            <div className={`${styles.node} ${styles.quiet}`} style={{ gridArea: "res" }}>
              Residents in the Millstadt EMS service area
            </div>
            <Connector area="c1" />
            <div className={`${styles.node} ${styles.board}`} style={{ gridArea: "board" }}>
              <span className={styles.boardTitle}>Board of Directors</span>
            </div>
            <Connector area="c2" className={styles.toChiefs} />

            <div className={`${styles.node} ${styles.quiet} ${styles.branch}`} style={{ gridArea: "sys" }}>
              Southwestern Illinois EMS System
            </div>
            <Connector area="c1b" className={styles.branch} />
            <div className={`${styles.node} ${styles.med} ${styles.branch}`} style={{ gridArea: "med" }}>
              <span className={styles.medTitle}>EMS Medical Director</span>
              <span className={styles.medName}>Leo Hsu, MD</span>
            </div>
            <div className={`${styles.oversight} ${styles.branch}`} style={{ gridArea: "c2b" }}>
              <div className={`${styles.conn} ${styles.dashed}`} aria-hidden="true">
                <i />
              </div>
              <span className={styles.oversightLabel}>Medical oversight</span>
            </div>
            <div className={styles.rail} style={{ gridArea: "rail" }} aria-hidden="true">
              <i />
            </div>
          </div>

          <div className={`${styles.node} ${styles.chiefs}`}>
            <span className={styles.chiefsTitle}>EMS Co-Chiefs</span>
            <span className={styles.chiefsNames}>
              <span>Jennifer Goetz</span>
              <i aria-hidden="true" />
              <span>Kenneth L. James Jr.</span>
            </span>
          </div>

          <Connector className={styles.stem} />

          <div className={`${styles.node} ${styles.training}`}>
            <span className={styles.trainingTitle}>Training Officer</span>
            <span className={styles.trainingNote}>When assigned</span>
          </div>

          <Connector className={styles.stem} />

          <div className={styles.providers}>
            <div className={styles.providersBar}>
              <span>Field providers</span>
            </div>
            <ul className={styles.providerGrid}>
              {FIELD_PROVIDERS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        </figure>
      </div>
    </section>
  );
}
