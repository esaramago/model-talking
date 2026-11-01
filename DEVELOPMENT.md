# Development Guide

This guide details the local setup, workflows, architecture conventions, and deployment procedures for developing applications with **Base Stack**.

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v20+ or v22+ LTS recommended)
- **PNPM** (v9+):
  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  ```
- **Docker & Docker Compose** (required to run the local PocketBase container)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the sample environment file to create your local `.env`:

```bash
cp .env.example .env
```

| Variable | Default (Local) | Production (Coolify) | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `3000` | `3000` | SvelteKit production server port |
| `POCKETBASE_PORT` | `8090` | `8090` | Host port mapped to the PocketBase container |
| `POCKETBASE_URL` | `http://pocketbase:8090` | `http://pocketbase:8090` | Internal server-to-server URL used by SvelteKit SSR (`hooks.server.ts`) |
| `VITE_POCKETBASE_URL` | `http://localhost:8090` | `https://api.yourdomain.com` | Public URL used by the client-side browser to contact PocketBase |

### 3. Start the Development Environment

Run the development command:

```bash
pnpm dev
```

> **Note:** The `pnpm dev` script automatically starts the PocketBase Docker container in the background (`docker compose up -d pocketbase`) before starting Vite.

Once started, the following services are available:

- **Frontend App:** [http://localhost:5174](http://localhost:5174)
- **PocketBase Admin UI:** [http://localhost:8090/_/](http://localhost:8090/_/)
- **PocketBase API Endpoint:** [http://localhost:8090/api/](http://localhost:8090/api/)

When accessing the PocketBase Admin UI for the first time, you will be prompted to create your initial superuser administrator account.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts PocketBase via Docker and launches the Vite dev server with HMR |
| `pnpm build` | Compiles the production SvelteKit application using `@sveltejs/adapter-node` |
| `pnpm preview` | Locally previews the production build output |
| `pnpm check` | Synchronizes SvelteKit types and runs static type checks via `svelte-check` |
| `pnpm check:watch` | Runs `svelte-check` in watch mode during active refactoring |

---

## 📐 Architecture & Development Conventions

To maintain code quality and consistency across projects, adhere to the following rules:

### 1. Layout & Styling Rules
- **No Tailwind or Utility CSS Frameworks:** Do not install Tailwind or similar utility-class libraries.
- **No Inline Styles:** Use component props and existing CSS custom properties.
- **Use `Grid.svelte` for Layouts:** Always use the `<Grid>` component for structural alignment, flex direction, and spacing instead of writing custom wrapper CSS.
- **Avoid Redundant Attributes:** The default `gap` for `<Grid>` is `m`. Avoid writing `<Grid gap="m">`.
- **Children Flex Grow:** Add `data-grow="1"` to any direct child of `<Grid>` to have it expand and fill remaining space.

#### `Grid.svelte` Props Reference:
```svelte
<Grid
  tag="div"              <!-- HTML element tag (default: 'div', e.g. 'section', 'nav', 'ul') -->
  direction="column"     <!-- 'row' | 'column' | 'row-reverse' | 'column-reverse' -->
  align="center"         <!-- 'start' | 'center' | 'end' -->
  justify="space-between"<!-- 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly' -->
  gap="l"                <!-- 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' (default: 'm') -->
  wrap={true}            <!-- boolean: enables flex-wrap -->
  break="small"          <!-- 'mobile' (max 767px) | 'small' (max 1023px) stacks into column -->
  fullWidth={true}       <!-- boolean: forces all direct children to width: 100% and flex: 1 -->
>
  <div data-grow="1">Main content</div>
  <div>Sidebar</div>
</Grid>
```

### 2. UI Components (WebAwesome)
- Use [WebAwesome](https://webawesome.com/) web components (`<wa-button>`, `<wa-card>`, `<wa-icon>`, `<wa-badge>`, `<wa-input>`, etc.) whenever possible.
- When introducing a new WebAwesome component, register it by importing its JavaScript bundle in `src/routes/+layout.svelte` (or in the page component where it is used):
  ```ts
  import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
  ```

### 3. Backend & Authentication Flow (PocketBase)
- **Client-Side:** Use the `pb` instance and the reactive `currentUser` store from `src/lib/pocketbase.ts`:
  ```svelte
  <script lang="ts">
    import { pb, currentUser } from '@/lib/pocketbase'
  </script>

  {#if $currentUser}
    <p>Logged in as: {$currentUser.email}</p>
  {/if}
  ```
- **Server-Side (SSR):** Handled automatically in `src/hooks.server.ts`. It loads auth cookies from incoming requests, checks token validity, refreshes sessions when possible, and passes `event.locals.pb` and `event.locals.user` to SvelteKit endpoints and load functions.

---

## 🐳 Docker & Coolify Deployment

This repository is optimized for deployment via [Coolify](https://coolify.io/) or Docker Compose.

### Local Testing of Production Build

To test the entire containerized stack locally:

```bash
# Build and start both Web app and PocketBase
docker compose up -d --build

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

The production services will be available at:
- Web App: `http://localhost:3000`
- PocketBase: `http://localhost:8090`

### Coolify Setup

When deploying to Coolify:
1. **Application Type:** Select **Docker Compose** (pointing to `docker-compose.yml`) or deploy the SvelteKit app via **Dockerfile** alongside a standalone PocketBase service.
2. **Persistent Storage:** Ensure the volume `pb_data` is mounted to `/pb_data` in the PocketBase container so database records and uploaded files persist across redeployments.
3. **Environment Variables:** Set production values in Coolify:
   - `PORT`: `3000`
   - `POCKETBASE_URL`: Internal network URL (e.g., `http://pocketbase:8090`)
   - `VITE_POCKETBASE_URL`: Public domain URL (e.g., `https://pb.yourdomain.com`)

---

## 🔧 Troubleshooting & Tips

- **PocketBase Port Conflict:** If port `8090` is already in use by another service on your machine, adjust `POCKETBASE_PORT` in your `.env` file (e.g., `POCKETBASE_PORT=8091`).
- **Stopping Background PocketBase:** If you want to stop the local PocketBase service after development:
  ```bash
  docker compose stop pocketbase
  ```
- **Resetting PocketBase Data:** To start with a fresh database locally, remove the Docker volume:
  ```bash
  docker compose down -v
  ```
- **Type Checking:** Run `pnpm check` before creating pull requests or deploying to catch TypeScript and Svelte syntax errors.
