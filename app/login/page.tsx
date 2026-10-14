import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(rawNext ?? "/");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Mi Catálogo</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ingresá la contraseña para continuar.
        </p>
      </header>
      <LoginForm next={next} />
    </div>
  );
}
