// Le motif de tuiles de la couverture du sujet, peint avec les lumières des services.
export default function Logo({ size = 28, className = "" }) {
  return (
    <svg viewBox="0 0 230 232" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <rect x="0" y="0" width="69" height="52" rx="10" fill="#FFA657" />
      <rect x="0" y="65" width="69" height="167" rx="10" fill="#C58CFF" />
      <rect x="81" y="0" width="149" height="85" rx="10" fill="#6CB8FF" />
      <rect x="81" y="98" width="149" height="30" rx="10" fill="#FFA657" />
      <rect x="81" y="141" width="68" height="91" rx="10" fill="#4FE3B0" />
      <rect x="162" y="141" width="68" height="91" rx="10" fill="#C58CFF" />
    </svg>
  );
}
