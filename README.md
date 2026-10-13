# Mi Catálogo

Aplicación web personal de seguimiento de películas y series: lo que estás viendo,
lo que querés ver y lo que ya viste, con puntuación de 1 a 5 estrellas por película
y por episodio. El catálogo se obtiene automáticamente de la [TMDB API](https://developer.themoviedb.org/docs).

- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Base de datos**: SQLite con Drizzle ORM (better-sqlite3) y migraciones versionadas
- **Uso**: local, un solo usuario, sin login
- **Idioma de la interfaz**: español

## Requisitos

- Node.js >= 20.9 (probado con Node 24)
- Un token de API de TMDB (gratis)

## Obtener el token de TMDB

1. Creá una cuenta gratuita en [themoviedb.org/signup](https://www.themoviedb.org/signup).
2. Andá a [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
3. Presioná **Create** (o **API Key**) y completá los datos; no importa la URL de la app.
4. En la sección **API Read Access Token** copiá el token (empieza con `eyJ...`).

## Configuración

```bash
cp .env.example .env
```

Editá `.env` y pegá tu token:

```env
TMDB_ACCESS_TOKEN=eyJhbGciOi...
TMDB_LANGUAGE=es-MX
```

`TMDB_LANGUAGE` admite locales de TMDB como `es-MX`, `es-AR`, `es-ES` o `en-US`
(por defecto `es-MX`). Si un título o sinopsis viene vacío en ese idioma, se usará
`en-US` como respaldo.

## Instalación y ejecución

```bash
npm install        # instala dependencias
npm run db:migrate # crea y migra la base de datos (data/app.db)
npm run dev        # desarrollo en http://localhost:3000
```

Scripts disponibles:

| Script               | Descripción                                             |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                                  |
| `npm run build`      | Build de producción                                     |
| `npm run start`      | Sirve el build de producción                            |
| `npm run lint`       | ESLint                                                  |
| `npm run typecheck`  | Verificación de tipos con TypeScript                    |
| `npm test`           | Tests unitarios (Vitest)                                |
| `npm run db:generate`| Genera una migración nueva a partir del schema          |
| `npm run db:migrate` | Aplica las migraciones pendientes a `data/app.db`       |

> La base de datos local (`data/`) y el archivo `.env` están en `.gitignore` y no
> se suben al repositorio.

## Notas

- El token de TMDB se usa **solo del lado del servidor** (server actions y route
  handlers); nunca llega al navegador.
- Las imágenes se sirven desde `image.tmdb.org` a través de `next/image`.
- Este producto usa la TMDB API pero no está respaldado ni certificado por TMDB.

## Licencia

Uso personal. Los datos de títulos, imágenes y sinopsis pertenecen a sus
respectivos autores y se usan según los términos de la [TMDB API](https://www.themoviedb.org/documentation/api/terms-of-use).