# MyRoots

**Live app:** [http://myroots.radicalloop.com/](http://myroots.radicalloop.com/)

## Description

MyRoots is a family tree platform for building, exploring, and sharing your family history.

Create interactive trees, add relatives with parent and spouse relationships, upload profile photos, invite others with view or edit access, and ask the AI assistant questions about your family — on web and mobile.

**What you can do**

- Build and visualize interactive family trees
- Add, edit, and remove people with relationships
- Upload profile photos
- Share trees by email invite or public view-only link
- Chat with an AI assistant about your tree
- Use the web app or the Expo mobile app

## Product Demo

<video src="https://github.com/user-attachments/assets/890d6b74-8a24-485b-8d18-004c15a5967b" controls width="720"></video>

## How to Use

1. Open [http://myroots.radicalloop.com/](http://myroots.radicalloop.com/) (or your local frontend after setup).
2. **Sign up / log in** with your email and password.
3. From the dashboard, **create a new family tree**.
4. Open the tree and **add a root person**, then add parents, children, and spouses.
5. Use **search** to find people and click a person to view or edit details.
6. **Share** the tree by email invite (view/edit) or copy the public view-only link.
7. Open **MyRoots Assistant** to ask questions about the tree or get help exploring your family.

## Setup on Your System

### Prerequisites

- **Node.js 24** ([nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **PostgreSQL 16+**
- **Yarn 1.x** for backend (`corepack enable`)
- **npm** for frontend and mobile
- **Docker & Docker Compose** (optional)

### Option A — Docker (fastest)

```bash
git clone <your-repo-url>
cd myroot

docker compose up --build -d
docker compose exec backend yarn migration:run
```

Open **http://localhost** in your browser.

```bash
docker compose down        # stop
docker compose down -v     # stop and reset database
```

### Option B — Local development

#### 1. Backend

```bash
cd backend
nvm use
corepack enable
yarn install

cp .env.example .env
# Edit .env — set DATABASE_URL, JWT secrets, and optional AWS / AI keys

createdb family_tree
yarn migration:run
yarn dev
```

API: **http://localhost:3001/api**

#### 2. Frontend

```bash
cd frontend
nvm use
npm install

cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3001/api

npm run dev
```

Web app: **http://localhost:5173**

#### 3. Mobile app (optional)

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

For Android emulators with a local backend:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
```

### Required environment variables (minimum)

**Backend** (`backend/.env`)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/family_tree` |
| `JWT_SECRET` | long random string (64+ chars) |
| `JWT_REFRESH_SECRET` | another long random string |
| `CORS_ORIGINS` | `http://localhost:5173` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Frontend** (`frontend/.env`)

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api` |

See `backend/.env.example`, `frontend/.env.example`, and `app/.env.example` for the full list (AWS S3, AI chat, Resend email, etc.).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, TypeORM, PostgreSQL |
| Frontend | React, Vite, TailwindCSS, React Flow |
| Mobile | Expo, React Native |
| Auth | JWT (access + refresh) |
| Storage | AWS S3 |
| AI | DeepSeek or OpenAI (optional) |

## Project Structure

```
myroot/
├── backend/     # NestJS API
├── frontend/    # React web app
├── app/         # Expo mobile app
├── docker-compose.yml
└── MyRoots-Product-Demo-final.mp4
```

More detail: [backend/README.md](backend/README.md) · [app/README.md](app/README.md)

## License

[MIT](LICENSE)
