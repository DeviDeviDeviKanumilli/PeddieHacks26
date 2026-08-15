# PeddieHacks26

AdaptFit is a mobile-first adaptive fitness experience for disabled adults and people
with temporary or chronic movement limitations. The repository contains a React/Vite
web client, a Fastify API, shared TypeBox contracts, pure domain rules, and a
Supabase/Postgres data layer.

## Workspace

- `apps/web`: React 19 and Vite client implementing the supplied screen references.
- `apps/api`: Fastify service for profiles, compatibility, workouts, sessions, and
  progress.
- `packages/contracts`: public validation schemas and inferred TypeScript types.
- `packages/domain`: deterministic compatibility, generation, and analytics rules.
- `supabase`: migrations, RLS policies, database functions, and deterministic seed data.
- `docs`: product scope, architecture, API, privacy, deployment, testing, and roadmap.

## Run locally

Requirements are Node.js 24 through 26, pnpm 11.5.1, and Supabase credentials only when
running the API or using live authentication.

```bash
pnpm install
pnpm dev
```

The web client runs at `http://localhost:5173`. Without client environment variables it
uses the demo adapter, seeded data, and local browser persistence, so the reference flow
can be explored without a backend.

To run the API, provide the server values shown in `.env.example` through your shell or
deployment environment, then run:

```bash
pnpm dev:api
```

The API runs at `http://localhost:3000`. `pnpm dev:web` is an explicit alias for the web
client, while `pnpm dev:all` starts both workspace dev
servers once the API environment is configured. In local development, Vite proxies
`/api` requests to port 3000 by default.

For live mode, copy `apps/web/.env.example` to `apps/web/.env.local` and set the public
Supabase URL and anon key. `VITE_API_URL` is optional locally because of the proxy. Never
put a Supabase service-role key or another server secret in a `VITE_` variable.

## Camera and pose privacy

Camera permission is optional and requested by the browser only when the user chooses
the demo tracking preview. Live mode uses manual counting until a production on-device
pose model is available. The camera stream stays in the browser. Raw video, images, audio, and pose
landmarks are not sent to or stored by the API; only allowlisted derived metrics may be
uploaded. The current client provides the camera and guided-session experience but does
not ship a production pose-estimation model. Demo feedback is explicitly labeled as
simulated. Pose inference is intentionally not a backend responsibility.

## Verification

```bash
pnpm format
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:check
pnpm build
```

The recursive typecheck, test, and build commands cover both applications and the shared
packages. Database checks are available through `pnpm test:db` when a disposable local
database URL is configured. See [the documentation index](docs/README.md) for the full
architecture and acceptance requirements.
