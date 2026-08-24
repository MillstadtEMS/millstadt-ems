"use client";

import Image from "next/image";
import { useRef } from "react";
import styles from "./ElectionInformation.module.css";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  caption: string;
  featured?: boolean;
};

export default function ZoomableElectionImage({
  src,
  alt,
  width,
  height,
  title,
  caption,
  featured = false,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <figure
        className={[
          styles.guideFigure,
          featured ? styles.featuredGuide : "",
        ].join(" ")}
      >
        <button
          type="button"
          className={styles.imageButton}
          onClick={() => dialogRef.current?.showModal()}
          aria-label={`Enlarge ${title}`}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            unoptimized
            sizes={
              featured
                ? "(max-width: 800px) calc(100vw - 2rem), 1400px"
                : "(max-width: 800px) calc(100vw - 2rem), 680px"
            }
          />
          <span className={styles.zoomLabel}>Enlarge</span>
        </button>
        <figcaption>
          <strong>{title}</strong>
          <span>{caption}</span>
        </figcaption>
      </figure>

      <dialog
        ref={dialogRef}
        className={styles.imageDialog}
        aria-label={`Enlarged view of ${title}`}
        onClick={(event) => {
          if (event.currentTarget === event.target) event.currentTarget.close();
        }}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogActions}>
            <a
              className={styles.fullSizeLink}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original-size picture
            </a>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => dialogRef.current?.close()}
            >
              Close enlarged picture
            </button>
          </div>
          <div className={styles.enlargedImage}>
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              unoptimized
              sizes="96vw"
            />
          </div>
          <p>{caption}</p>
        </div>
      </dialog>
    </>
  );
}
