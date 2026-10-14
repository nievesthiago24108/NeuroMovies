import type { Metadata } from "next";
import Image from "next/image";
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
      <header className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/images/logo-mark.png"
          alt=""
          width={48}
          height={48}
          priority
          className="h-12 w-12 invert dark:invert-0"
        />
        <h1 className="font-display text-3xl font-semibold tracking-tight">NeuroMovies</h1>
        <p className="text-sm text-muted">
          Ingresá la contraseña para continuar.
        </p>
      </header>
      <LoginForm next={next} />
    </div>
  );
}
