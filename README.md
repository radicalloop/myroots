<h1 align="center">MyRoots</h1>

<p align="center"><strong>Describe your family. Watch AI build your tree.</strong></p>

<p align="center">A family tree platform you can try online or host yourself — create interactive trees, share them with relatives, and explore your history with an AI assistant.</p>

<p align="center">
  <a href="https://myroots.radicalloop.com"><img src="https://img.shields.io/badge/Live_Demo-myroots.radicalloop.com-2ea44f?style=flat-square" alt="Live Demo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 24" />
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS 10" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.8" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Ready" />
</p>

<p align="center">
  <img src="docs/screenshot-hero.jpg" alt="MyRoots — The AI-powered family historian" width="720" />
</p>

<p align="center">
  <strong>Try it online:</strong> <a href="https://myroots.radicalloop.com">myroots.radicalloop.com</a>&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Want full control?</strong> Self-host with Docker (below).
</p>

---

## Screenshots

<p align="center">
  <img src="docs/screenshot-tree.jpg" alt="Build a family tree with the MyRoots AI assistant" width="900" />
  <br />
  <em>Describe your family in chat — AI builds the tree</em>
</p>

<p align="center">
  <img src="docs/screenshot-chat.jpg" alt="Search people in your family tree" width="900" />
  <br />
  <em>Search anyone in your tree, export PDF, share with family</em>
</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/a0c8e0d2-c9c5-4869-8258-3e6369ff6100" poster="https://github.com/radicalloop/myroots/raw/master/docs/demo-thumbnail.jpg" controls muted width="900"></video>
</p>

<p align="center">
  <em>▶ Video not playing? <a href="./MyRoots-Product-Demo-final.mp4">Watch the full product demo (~52s)</a>.</em>
</p>

---

## Features

- **Interactive family trees** — parents, children, spouses, and visual layout
- **AI assistant** — describe your family in plain language; add, edit, and explore by chat
- **Photos & profiles** — upload headshots and person details
- **Sharing** — email invites (view or edit) or a public view-only link
- **Export** — download your tree as PDF
- **Web + mobile** — React web app and Expo React Native client

---

## Two ways to use MyRoots

| | Hosted | Self-hosted |
|---|--------|-------------|
| **Best for** | Trying the product quickly | Full control of data & deployment |
| **URL** | [myroots.radicalloop.com](https://myroots.radicalloop.com) | Your own domain / `localhost` |
| **Setup** | Sign up and go | Docker Compose (recommended) or local Node |

---

## Self-host with Docker (recommended)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone https://gitlab.com/radicallooplab/myroot.git
cd myroot

docker compose up --build -d
docker compose exec backend yarn migration:run
```

Open **http://localhost** in your browser.

| Service | URL |
|---------|-----|
| Web app | http://localhost |
| API | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |

```bash
docker compose down        # stop
docker compose down -v     # stop and wipe the database volume
```

> **Production tips:** Replace the default JWT secrets and database password in `docker-compose.yml`, put HTTPS in front (nginx / Caddy / Traefik), and rebuild the frontend with `VITE_API_BASE_URL` pointing at your public API if the browser will not call `http://localhost:3001/api`.

---

## Local development

**Prerequisites**

- Node.js 24 ([nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)) — see `.nvmrc`
- PostgreSQL 16+
- Yarn 1.x for the backend (`corepack enable`)
- npm for the frontend and mobile app

### 1. Backend

```bash
cd backend
nvm use
corepack enable
yarn install

cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGINS

createdb family_tree
yarn migration:run
yarn dev
```

API: **http://localhost:3001/api**

### 2. Frontend

```bash
cd frontend
nvm use
npm install

cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3001/api

npm run dev
```

Web app: **http://localhost:5173**

### 3. Mobile (optional)

```bash
cd app
nvm use
npm install

cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3001/api
# EXPO_PUBLIC_PUBLIC_WEB_URL=http://localhost:5173

npm start
```

```bash
npm run android   # Android
npm run ios       # iOS
```

Android emulator talking to a local API:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api npm start
```

---

## Configuration

### Minimum (backend)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/family_tree` |
| `JWT_SECRET` | 64+ character random string |
| `JWT_REFRESH_SECRET` | another 64+ character random string |
| `CORS_ORIGINS` | `http://localhost:5173` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api` |

### Optional

| Capability | Variables |
|------------|-----------|
| Image uploads (S3) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` |
| Local image storage | `LOCAL_UPLOAD_DIR` (used when S3 is unset) |
| AI chat | `AI_MODAL`, `AI_API_KEY`, `AI_BASE_URL` |
| Invite email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

Full templates: [`backend/.env.example`](backend/.env.example) · [`frontend/.env.example`](frontend/.env.example) · [`app/.env.example`](app/.env.example)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, TypeORM, PostgreSQL |
| Frontend | React, Vite, Tailwind CSS, React Flow |
| Mobile | Expo, React Native |
| Auth | JWT (access + refresh) |
| Storage | AWS S3 or local uploads |
| AI | DeepSeek or OpenAI (optional) |

---

## Project structure

```
myroot/
├── backend/              # NestJS API
├── frontend/             # React web app
├── app/                  # Expo mobile app
├── docs/                 # README screenshots
├── docker-compose.yml    # Self-host stack (db + api + web)
└── MyRoots-Product-Demo-final.mp4
```

More detail: [backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md) · [app/README.md](app/README.md)

---

## Using the app

1. Open the [hosted app](https://myroots.radicalloop.com) or your self-hosted URL.
2. Sign up or log in.
3. Create a family tree from the dashboard.
4. Add a root person, then parents, children, and spouses — or describe the family to **MyRoots Assistant**.
5. Search people, edit details, upload photos, and share via invite or public link.

---

## License

[MIT](LICENSE)
