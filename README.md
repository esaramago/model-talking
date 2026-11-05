# Model Talking

Two AI agents discussing with each other. They are very firm in their views, but always cordial.

---

## 🎯 Overview

**Model Talking** is an interactive experimentation app built on SvelteKit 2 and Svelte 5. It allows you to initiate a conversation topic (acting as Agent 1 or an initiator), watch Agent 2 respond, then have Agent 1 reply to Agent 2, back and forth in an automated or step-by-step dialogue.

To prevent runaway API costs, conversations are bounded by strict turn limits and per-response token limits, accompanied by real-time token tracking.

---

## ✨ Key Features

- **🤖 Dual Agent Dialogue:** Configure two independent AI models or personas (via OpenRouter) and watch them converse.
- **🛡️ Token & Cost Protection:** Configurable maximum turns (e.g. 2 to 10 turns) and maximum tokens per response to avoid excessive consumption.
- **📊 Realtime Token Counters:** Live counters of prompt tokens, completion tokens, and total tokens used in each session.
- **⏯️ Step-by-Step or Auto Play:** Run the dialogue automatically turn-by-turn or step through each turn manually.
- **🎨 WebAwesome UI & Grid Layout:** Clean, responsive UI utilizing WebAwesome web components and the custom `Grid.svelte` layout system.
- **⚡ Fast & Modern:** Built with SvelteKit 2, Svelte 5 runes, and TypeScript.

---

## 🚀 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [SvelteKit 2](https://kit.svelte.dev/) / [Svelte 5](https://svelte.dev/) | Reactive modern web application framework |
| **LLM Gateway** | [OpenRouter](https://openrouter.ai/) | Unified API for models from OpenAI, Anthropic, Google, Meta, and open-source |
| **UI Components** | [WebAwesome](https://webawesome.com/) | Standardized, accessible Web Components |
| **Styling** | Vanilla CSS Architecture | Modular CSS tokens and `Grid.svelte` layout system |
| **Package Manager** | [PNPM](https://pnpm.io/) | Fast disk-efficient package manager |

---

## 📖 Getting Started

### Prerequisites

- Node.js 20+
- PNPM (`npm install -g pnpm`)
- An OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))

### Installation

1. Clone or navigate to the directory:
   ```bash
   cd model-talks
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `OPENROUTER_API_KEY` in `.env`.

4. Run the development server:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## 🔒 Production & Reverse Proxy Deployment

When deploying the production container behind a reverse proxy (e.g. Coolify, Traefik, Caddy, Nginx, Cloudflare):

- **`ORIGIN`:** Set to your public app domain (e.g., `https://chat.yourdomain.com`). Required by `@sveltejs/adapter-node` for CSRF validation on form actions.
- **`ADDRESS_HEADER` & `XFF_DEPTH`:** Set `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1` so SvelteKit safely reads the real client IP appended by your trusted proxy, preventing IP spoofing.
- **`AUTH_SECRET`:** Required in production. The app refuses to start without it. When migrating an existing deployment, set it to the current `RATE_LIMIT_SECRET` value so existing sessions and encrypted TOTP secrets stay valid.
- **`POCKETBASE_PROXY_SECRET`:** Required in production. PocketBase (via `pb_hooks/proxy_guard.pb.js`) rejects user authentication, registration and batch requests that do not carry this secret, so 2FA and rate limits cannot be bypassed by reaching PocketBase directly. Mount `pb_hooks` into the PocketBase container and pass the same variable to both services.
- **`WEB_BIND_ADDRESS`:** Defaults to `127.0.0.1` so the app is only reachable through your reverse proxy. Set it to `0.0.0.0` only if the app must be reachable directly.
- **Persistent Rate Limiting:** Configure `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` in production so usage limits and authentication lockouts persist in PocketBase and are shared across multiple instances.

For more details, see [DEVELOPMENT.md](DEVELOPMENT.md).

---

## 📄 License

Distributed under the [AGPL](LICENSE) License.
