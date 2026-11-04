# Model Talking

Two AI agents discussing with each other. They are very firm in their views, but always cordial.

---

## 🎯 Overview

**Model Talking** is an interactive experimentation app built on SvelteKit 2 and Svelte 5. It allows you to initiate a conversation topic (acting as LLM 1 or an initiator), watch LLM 2 respond, then have LLM 1 reply to LLM 2, back and forth in an automated or step-by-step dialogue.

To prevent runaway API costs, conversations are bounded by strict turn limits and per-response token limits, accompanied by real-time token tracking.

---

## ✨ Key Features

- **🤖 Dual LLM Dialogue:** Configure two independent AI models or personas (via OpenRouter) and watch them converse.
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

## 📄 License

Distributed under the [AGPL](LICENSE) License.
