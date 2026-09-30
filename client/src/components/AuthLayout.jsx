import Logo from "./ui/Logo";
import Icon from "./ui/Icon";
import Pane from "./ui/Pane";

// Le produit lui-même sert d'illustration : trois vitres éclairées, comme sur le dashboard.
function Showcase() {
  return (
    <div className="relative h-[330px] w-full max-w-[520px]" aria-hidden="true">
      <Pane light="#6CB8FF" index={1} className="absolute left-0 top-12 w-[220px]" glassClassName="p-5">
        <p className="flex items-center gap-1.5 text-sm text-haze">
          <Icon name="pin" size={14} />
          Cotonou
        </p>
        <p className="type-numeral mt-6 text-[5.5rem] leading-[0.9]">
          26<span className="ml-1 align-top text-3xl font-normal tracking-normal text-haze">°C</span>
        </p>
      </Pane>

      <Pane light="#FFA657" index={2} className="absolute left-[204px] top-0 w-[300px]" glassClassName="p-5">
        <p className="text-sm text-haze">Bitcoin</p>
        <p className="type-numeral mt-1 text-4xl">64 250 $</p>
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-16 w-full">
          <defs>
            <linearGradient id="showcase-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFA657" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFA657" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="0,32 0,24 12,22 24,26 36,17 48,19 60,11 72,14 84,6 100,9 100,32" fill="url(#showcase-area)" />
          <polyline
            points="0,24 12,22 24,26 36,17 48,19 60,11 72,14 84,6 100,9"
            fill="none"
            stroke="#FFA657"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Pane>

      <Pane light="#C58CFF" index={3} className="absolute left-[64px] top-[214px] w-[340px]" glassClassName="p-5">
        <p className="text-sm font-medium">feat: widgets en direct</p>
        <p className="mt-1.5 flex items-center gap-3 text-xs text-haze">
          <span>MoMo</span>
          <span>il y a 2 minutes</span>
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-frost">a1b2c3d</code>
        </p>
      </Pane>
    </div>
  );
}

// Pages de connexion et d'inscription.
export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_minmax(440px,560px)]">
      <div className="hidden flex-col justify-between gap-12 p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="type-display text-xl">Dashboard</span>
        </div>
        <div className="space-y-12">
          <div>
            <p className="type-display max-w-lg text-5xl leading-[1.04] xl:text-6xl">Tous vos services sur un seul écran.</p>
            <p className="mt-5 max-w-md leading-relaxed text-haze">
              Météo, crypto, GitHub, flux RSS : choisissez vos widgets, placez-les où vous voulez, ils se mettent à jour
              tout seuls.
            </p>
          </div>
          <Showcase />
        </div>
      </div>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <Pane light="#8FA2FF" className="w-full max-w-md" glassClassName="p-7 sm:p-9">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo size={24} />
            <span className="type-display text-lg">Dashboard</span>
          </div>
          <h1 className="type-display text-3xl">{title}</h1>
          <div className="mt-7">{children}</div>
          <p className="mt-7 text-sm text-haze">{footer}</p>
        </Pane>
      </main>
    </div>
  );
}
