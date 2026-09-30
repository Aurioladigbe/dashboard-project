/**
 * Une vitre fumée éclairée par derrière (voir .pane dans index.css).
 * - light : couleur de la lumière (celle du service) ;
 * - state : "ready" | "loading" | "error" (la lumière baisse, ou vire au rouge) ;
 * - pulse : la lumière pulse une fois (nouvelle donnée reçue) ;
 * - index : rang d'apparition, pour décaler l'entrée des panneaux au chargement.
 * Les autres props (aria-labelledby…) vont sur l'élément vitre (`as`).
 */
export default function Pane({
  light = "#A3ACCF",
  state = "ready",
  pulse = false,
  index = 0,
  as: Tag = "div",
  className = "",
  glassClassName = "",
  children,
  ...props
}) {
  return (
    <div
      className={`pane ${className}`}
      data-state={state}
      data-pulse={pulse ? "true" : undefined}
      style={{ "--light": light, "--i": index }}
    >
      <div className="pane-light" aria-hidden="true" />
      <Tag className={`pane-glass glass flex flex-col ${glassClassName}`} {...props}>
        {children}
      </Tag>
    </div>
  );
}
