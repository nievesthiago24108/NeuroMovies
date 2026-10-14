import Link from "next/link";

const steps = [
  {
    title: "1. Creá una cuenta",
    body: "Registrate gratis en themoviedb.org. Solo necesitás un email.",
    href: "https://www.themoviedb.org/signup",
  },
  {
    title: "2. Generá tu API key",
    body: "Entrá a Settings → API y creá una API key de tipo “User”. No importa la URL de la aplicación.",
    href: "https://www.themoviedb.org/settings/api",
  },
  {
    title: "3. Copiá tu API Read Access Token",
    body: "Es el token que empieza con “eyJ…”. Pegalo en el archivo .env como TMDB_ACCESS_TOKEN.",
    href: null,
  },
  {
    title: "4. Reiniciá el servidor",
    body: "Las variables de entorno se leen al arrancar. Reiniciá `npm run dev` y todo listo.",
    href: null,
  },
];

export function SetupGuide() {
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {step.title.split(".")[0]}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted">{step.body}</p>
              {step.href ? (
                <Link
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {step.href.replace("https://www.", "")}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="rounded-card border border-line bg-surface-2 p-3 text-xs text-muted">
        El token se usa <strong>solo del lado del servidor</strong> y nunca llega al
        navegador. Si todavía no aparece nada, revisá que el archivo{" "}
        <code className="rounded bg-surface px-1">.env</code> esté en la raíz
        del proyecto.
      </p>
    </div>
  );
}