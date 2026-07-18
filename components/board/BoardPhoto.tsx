/** Small profile photo. Isolated so the no-img-element suppression applies
 *  cleanly (board photos are user-uploaded, not build-time assets). */
export default function BoardPhoto({ src, alt = "" }: { src: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} />;
}
