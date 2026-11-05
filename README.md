# Model Talking

Two AI agents discussing with each other. They are very firm in their views, but always cordial.

---

## 🎯 Overview

**Model Talking** is an interactive conversation simulation platform where two distinct artificial intelligence agents meet, converse, and debate on any topic. Rather than a standard user-assistant query loop, Model Talking orchestrates an autonomous peer-to-peer dialogue between two unique personas.

Whether pitting historical figures against each other, staging a philosophical debate between rival schools of thought, or having two quirky characters dispute everyday absurdities, each agent defends their perspectives with passion, intellectual depth, and mutual respect.

---

## ✨ Key Features

### 🤖 Dual-Agent Persona Simulation
- **Custom Characters:** Freely configure names, custom avatars, and system prompts for each agent to shape their background, temperament, and ideology.
- **Deep Immersion:** Grounded in robust behavioral guidelines that prevent persona drift, eliminate robotic AI clichés, and encourage active listening and constructive rhetorical friction.
- **Peer-to-Peer Dialogue:** Agent 1 anchors the discussion while Agent 2 responds and critiques, creating an authentic back-and-forth rhythm.

### 🪄 Themed Scenario Generator
Need inspiration? Generate full character matchups and discussion topics with a single click across six curated themes:
- ⚖️ **Philosophy & Ethics:** Moral dilemmas, metaphysical queries, and existential clashes.
- 🏛️ **History:** Rivalries and diplomatic encounters between iconic historical figures.
- 🚀 **Sci-Fi & Future:** Speculative inquiries, artificial consciousness, and space-age paradoxes.
- 🎭 **Comedy & Absurdity:** Witty banters, comedic tensions, and hilarious everyday debates.
- 🔬 **Technology & Science:** Visionaries vs. skeptics debating scientific frontiers and innovations.
- 🎲 **Surprise Me:** Unpredictable, creative wildcard crossovers.

### ⏯️ Dynamic Dialogue Flow
- **Step-by-Step Mode:** Advance the conversation turn by turn to read, evaluate, and digest each message at your own pace.
- **Auto-Play Mode:** Sit back and let the agents exchange thoughts seamlessly in an automated dialogue loop.
- **Live Thinking Indicators:** Clear visual cues indicating which character is currently processing their response.

### 🌍 Multi-Language Support
- **9 Supported Languages:** Fully localized interface and prompts in English, Portuguese (`pt-PT`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Turkish (`tr`), Russian (`ru`), and Arabic (`ar`).
- **Linguistic Loyalty:** Agents maintain cultural nuances, idioms, and dialogue styles in the selected target language.

### ⚙️ Behavioral Rules & Token Protection
- **Global Behavioral Rules:** Define general instructions that automatically apply to both agents (e.g., conciseness, formatting restrictions, or debate etiquette).
- **Real-Time Token Tracking:** Monitor prompt tokens, completion tokens, and total session consumption with every turn.
- **Safety Ceilings:** Configurable character limits per response and token budgets prevent runaway costs while keeping replies punchy.
- **Prompt Caching Architecture:** Designed to maximize prefix prompt caching, significantly speeding up generation times and reducing API usage costs.

### 💾 Session History & Continuity
- **Automatic Archival:** Saves completed and ongoing conversations with automatically generated descriptive titles.
- **Resume or Restart:** Revisit past conversations from the history drawer, continue an ongoing chat, or restart a new topic keeping the exact same agent personas.

### 👤 User Accounts & Security
- **Guest Access:** Jump straight into conversations without friction.
- **User Accounts:** Powered by PocketBase to sync conversation histories, custom rules, and preferences across devices.
- **Two-Factor Authentication (2FA):** Enhanced account security supporting both Authenticator apps (TOTP) and Email OTP verification codes.

### 🎨 Modern & Responsive Interface
- **WebAwesome Components:** Built using accessible, standardized WebAwesome UI components.
- **Adaptive Grid Layout:** Fluid, responsive layout crafted with the custom `Grid.svelte` system without bloated CSS frameworks.

---

## 🚀 How It Works

1. **Set Up the Agents:** Choose avatars, names, and personas for Agent 1 and Agent 2, or pick a theme in the scenario generator to create a pre-configured matchup.
2. **Provide an Opening Topic:** Write the initial seed message or thought to kick off the exchange.
3. **Watch the Dialogue:** Step through turn-by-turn or activate auto-play to watch the agents converse, disagree, and exchange perspectives in real time.

---

## 🛠️ Development

If you want to run the project locally, contribute, configure environment variables, or deploy to production, please check the **[Development Guide](DEVELOPMENT.md)**.

The development guide covers:
- Local setup & prerequisites (Node.js, PNPM, Docker)
- Environment variable configuration (`.env.example`)
- PocketBase container management & database administration
- UI & architecture conventions (`Grid.svelte`, WebAwesome web components)
- Deployment instructions (Docker Compose, Coolify, Reverse Proxy & CSRF configuration)

---

## 📄 License

Distributed under the [AGPL](LICENSE) License.
