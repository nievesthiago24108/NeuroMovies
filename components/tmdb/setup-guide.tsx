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
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {step.title.split(".")[0]}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{step.title}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.body}</p>
              {step.href ? (
                <Link
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
                >
                  {step.href.replace("https://www.", "")}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        El token se usa <strong>solo del lado del servidor</strong> y nunca llega al
        navegador. Si todavía no aparece nada, revisá que el archivo{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env</code> esté en la raíz
        del proyecto.
      </p>
    </div>
  );
}