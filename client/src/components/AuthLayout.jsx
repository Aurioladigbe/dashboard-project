import Logo from "./ui/Logo";

// Page de connexion / d'inscription : l'illustration à gauche est le motif de
// tuiles de la charte, le formulaire à droite.
export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <div className="hidden flex-col justify-between bg-ink-950 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <span className="font-display text-3xl tracking-wide">Dashboard</span>
        </div>
        <div>
          <Logo size={280} className="mb-10" />
          <p className="max-w-md font-display text-5xl leading-tight tracking-wide">
            Tous vos services sur un seul écran.
          </p>
          <p className="mt-4 max-w-md text-mist">
            Météo, crypto, GitHub, flux RSS : choisissez vos widgets, placez-les où vous voulez, ils se mettent à
            jour tout seuls.
          </p>
        </div>
        <span />
      </div>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={28} />
            <span className="font-display text-2xl tracking-wide">Dashboard</span>
          </div>
          <h1 className="font-display text-4xl tracking-wide">{title}</h1>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-sm text-mist">{footer}</p>
        </div>
      </main>
    </div>
  );
}
