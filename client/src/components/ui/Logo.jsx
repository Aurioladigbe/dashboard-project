// Le motif de tuiles de la couverture du sujet, redessiné en SVG.
// Sert de logo (petit) et d'illustration des pages de connexion (grand).
export default function Logo({ size = 28, className = "" }) {
  return (
    <svg viewBox="0 0 230 232" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <rect x="0" y="0" width="69" height="52" fill="#FF5F3C" />
      <rect x="0" y="65" width="69" height="167" fill="#FF4DF0" />
      <rect x="81" y="0" width="149" height="85" fill="#00FF9C" />
      <rect x="81" y="98" width="149" height="30" fill="#FF5F3C" />
      <rect x="81" y="141" width="68" height="91" fill="#00FF9C" />
      <rect x="162" y="141" width="68" height="91" fill="#FF4DF0" />
    </svg>
  );
}
