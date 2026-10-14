# Mi Catálogo

Aplicación web personal de seguimiento de películas y series: lo que estás viendo,
lo que querés ver y lo que ya viste, con puntuación de 1 a 5 estrellas por película
y por episodio. El catálogo se obtiene automáticamente de la [TMDB API](https://developer.themoviedb.org/docs).

- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Base de datos**: PostgreSQL con Drizzle ORM y migraciones versionadas
- **Despliegue**: Vercel (por ejemplo, con PostgreSQL de Neon)
- **Uso**: personal, un solo usuario, con inicio de sesión por contraseña
- **Idioma de la interfaz**: español

## Requisitos

- Node.js >= 20.9 (probado con Node 24)
- Un token de API de TMDB (gratis)
- Una base de datos PostgreSQL (local o en Neon / Vercel)

## Obtener el token de TMDB

1. Creá una cuenta gratuita en [themoviedb.org/signup](https://www.themoviedb.org/signup).
2. Andá a [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
3. Presioná **Create** (o **API Key**) y completá los datos; no importa la URL de la app.
4. En la sección **API Read Access Token** copiá el token (empieza con `eyJ...`).

## Configuración

```bash
cp .env.example .env
```

Editá `.env`:

```env
# TMDB
TMDB_ACCESS_TOKEN=eyJhbGciOi...
TMDB_LANGUAGE=es-MX

# PostgreSQL (obligatorio)
DATABASE_URL=postgresql://usuario:clave@host:5432/base

# Inicio de sesión (opcional en local, recomendado en la web)
APP_PASSWORD=tu-contraseña
AUTH_SECRET=una-cadena-larga-y-aleatoria
```

- `TMDB_LANGUAGE` admite locales de TMDB como `es-MX`, `es-AR`, `es-ES` o `en-US`
  (por defecto `es-MX`). Si un título o sinopsis viene vacío en ese idioma, se usará
  `en-US` como respaldo.
- `DATABASE_URL` también acepta el nombre `POSTGRES_URL` que inyecta la integración
  de Neon/Vercel. Si usás el *pooler* de Neon, incluí el sufijo `-pooler`.
- `DATABASE_URL_UNPOOLED` (la conexión **directa** de Neon, sin `-pooler`) es
  opcional: la usan las migraciones y la importación, que no van por el pooler.
- Si `APP_PASSWORD` queda vacío, **no se pide login** (cómodo para desarrollo). Si
  lo definís, se exige contraseña. `AUTH_SECRET` firma la cookie de sesión; si no
  lo definís, se usa `APP_PASSWORD`.

## Instalación y ejecución

```bash
npm install         # instala dependencias
npm run db:migrate  # aplica las migraciones (usa DATABASE_URL_UNPOOLED si existe)
npm run dev         # desarrollo en http://localhost:3000
```

Scripts disponibles:

| Script                     | Descripción                                              |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo                                   |
| `npm run build`            | Build de producción                                      |
| `npm run start`            | Sirve el build de producción                             |
| `npm run lint`             | ESLint                                                   |
| `npm run typecheck`        | Verificación de tipos con TypeScript                     |
| `npm test`                 | Tests unitarios (Vitest)                                 |
| `npm run db:generate`      | Genera una migración nueva a partir del schema           |
| `npm run db:migrate`       | Aplica las migraciones pendientes (usa `DATABASE_URL_UNPOOLED`) |
| `npm run db:import-sqlite` | Importa los datos de un `data/app.db` viejo (ver abajo)  |

> El archivo `.env` (y la base SQLite vieja en `data/`) están en `.gitignore` y no
> se suben al repositorio.

## Inicio de sesión

Es un login simple de un solo usuario:

- Se define `APP_PASSWORD` en el entorno.
- Al entrar, se guarda una **cookie firmada** (HMAC-SHA256, `httpOnly`).
- Un `proxy.ts` (el ex `middleware`) redirige a `/login` a quien no tenga sesión, y
  cada Server Action vuelve a verificar la sesión antes de escribir.

## Despliegue en Vercel

1. Subí el repositorio a GitHub.
2. Importá el proyecto en Vercel.
3. Creá una base PostgreSQL (por ejemplo con la integración de **Neon**) y verificá
   que quede disponible la variable `DATABASE_URL` (o `POSTGRES_URL`).
4. Definí `TMDB_ACCESS_TOKEN`, `APP_PASSWORD` y `AUTH_SECRET` en *Environment Variables*.
5. Aplicá las migraciones contra esa base (con la URL **directa**, sin `-pooler`):
   ```bash
   DATABASE_URL_UNPOOLED="postgresql://...neon.tech/..." npm run db:migrate
   ```
6. Deploy. Listo.

La app usa **`pg` (node-postgres) + pool** y `attachDatabasePool` de
`@vercel/functions`, el método recomendado en Vercel Fluid compute (reutiliza la
conexión TCP entre requests). Dejá `DATABASE_URL` apuntando al endpoint `-pooler`.

> SQLite no sirve en Vercel (el sistema de archivos es efímero y de solo lectura);
> por eso el proyecto usa PostgreSQL.

### Setup con la CLI de Neon

Si preferís que Neon configure todo:

```bash
npm i -g neon@latest
neon login
neon init -y --org-id <org> --project-id <proyecto> --branch production --services postgres
neon deploy
```

`neon init` crea `neon.ts` (se versiona), `.neon` (ignorado) y escribe
`DATABASE_URL`, `DATABASE_URL_UNPOOLED` y `NEON_BRANCH` en `.env`.

## Migrar datos desde la SQLite vieja

Si tenías datos en la versión anterior (basada en SQLite):

```bash
npm run db:import-sqlite
```

Lee `data/app.db` (o `DATABASE_FILE`), carga `.env` por su cuenta y copia títulos,
temporadas, episodios, biblioteca y progreso a PostgreSQL (prefiere
`DATABASE_URL_UNPOOLED`). Se niega a pisar una base que ya tenga títulos salvo que
le pases `--force`.

## Notas

- El token de TMDB se usa **solo del lado del servidor** (server actions y route
  handlers); nunca llega al navegador.
- Las imágenes se sirven desde `image.tmdb.org` a través de `next/image`.
- Este producto usa la TMDB API pero no está respaldado ni certificado por TMDB.

## Licencia

Uso personal. Los datos de títulos, imágenes y sinopsis pertenecen a sus
respectivos autores y se usan según los términos de la [TMDB API](https://www.themoviedb.org/documentation/api/terms-of-use).
