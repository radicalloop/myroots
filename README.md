# MyRoots — Family Tree

A full-stack family tree web application for building, visualizing, and sharing interactive family trees with an AI-powered assistant.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development Setup](#local-development-setup)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Mobile App](#mobile-app)
- [Environment Variables](#environment-variables)
  - [Backend](#backend-environment-variables)
  - [Frontend](#frontend-environment-variables)
  - [Mobile App](#mobile-app-environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [License](#license)

## Features

- **Tree visualization** — interactive hierarchical web tree layout using React Flow and Dagre, plus native mobile tree browsing in Expo
- **Person management** — add, edit, and delete family members with parent-child and spouse relationships
- **Image uploads** — profile photos stored via AWS S3 signed URLs
- **AI Chat assistant** — DeepSeek or OpenAI-powered assistant that answers questions about your tree and can add/edit people
- **Tree sharing** — share your tree with other users via email invite (view or edit permissions)
- **JWT authentication** — signup, login, access/refresh token rotation

## Tech Stack

| Layer   | Technology                                           |
|---------|------------------------------------------------------|
| Backend | NestJS 10, TypeORM 0.3, PostgreSQL 16                |
| Frontend| React 19, Vite 6, TailwindCSS 4, React Flow, Dagre   |
| Mobile  | Expo, React Native, TypeScript, Expo Router          |
| Auth    | JWT (access + refresh tokens, passport-jwt)           |
| Storage | AWS S3 (signed URLs)                                  |
| AI      | DeepSeek v4-pro or OpenAI GPT-4o-mini (optional)      |
| Runtime | Node.js 24                                            |

## Prerequisites

- **Node.js 24** (use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **PostgreSQL 16+** (local install or Docker)
- **Yarn 1.x** (for backend — use `corepack enable`)
- **npm** (for frontend — ships with Node.js)
- **Expo tooling** (for mobile — installed through the `app` package)
- **Docker & Docker Compose** (optional, for containerized setup)

## Quick Start (Docker)

The easiest way to get the full stack running is with Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/myroots.git
cd myroots

# 2. Start all services (PostgreSQL, backend, frontend) in the background
docker compose up --build -d

# 3. Apply database migrations
docker compose exec backend yarn migration:run
```

Then open **http://localhost** in your browser.

To stop the services:

```bash
docker compose down
```

To remove volumes (resets the database):

```bash
docker compose down -v
```

## Local Development Setup

### Backend

```bash
cd backend

# Use the correct Node version
nvm use   # or: fnm use

# Install dependencies
corepack enable
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your local database and (optionally) AWS/AI credentials

# Create the database
createdb family_tree   # or use your DB client

# Apply migrations
yarn migration:run

# Start the dev server
yarn dev
```

The backend API runs at **http://localhost:3001/api**.

### Frontend

```bash
cd frontend

# Use the correct Node version
nvm use   # or: fnm use

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the dev server
npm run dev
```

The frontend runs at **http://localhost:5173**.

### Mobile App

```bash
cd app

# Use Node 24 from the repository .nvmrc
nvm use   # or: fnm use

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit EXPO_PUBLIC_API_URL for your machine/emulator

# Start Expo
npm start
```

Run on specific targets:

```bash
npm run android   # Android emulator or device
npm run ios       # iOS simulator or device
npm run dev       # Development build client
```

For Android emulators with a local backend, set:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
```

## Environment Variables

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust the values.

| Variable                        | Required | Default                           | Description                                      |
|---------------------------------|----------|-----------------------------------|--------------------------------------------------|
| `PORT`                          | No       | `3001`                            | API server port                                  |
| `API_BASE_URL`                  | No       | `http://localhost:3001/api`       | Public API base URL                              |
| `DB_HOST`                       | Yes      | `localhost`                       | PostgreSQL host                                  |
| `DB_PORT`                       | No       | `5432`                            | PostgreSQL port                                  |
| `DB_USER`                       | Yes      | `postgres`                        | PostgreSQL user                                  |
| `DB_PASSWORD`                   | Yes      | `postgres`                        | PostgreSQL password                              |
| `DATABASE_URL`                  | Yes      | —                                 | Full PostgreSQL connection string                |
| `JWT_SECRET`                    | Yes      | —                                 | Access token signing secret (64+ chars)          |
| `JWT_REFRESH_SECRET`            | Yes      | —                                 | Refresh token signing secret (64+ chars)         |
| `CORS_ORIGINS`                  | Yes      | `http://localhost:5173`           | Comma-separated allowed origins                  |
| `BCRYPT_SALT_ROUNDS`            | No       | `10`                              | Password hashing rounds                          |
| `FRONT_URL`                     | No       | `http://localhost:3000`           | Frontend URL (used for redirects)                |
| `RATE_LIMIT_TTL_MS`             | No       | `60000`                           | Rate limit window in ms                          |
| `RATE_LIMIT_MAX`                | No       | `100`                             | Max requests per window                          |
| `REQUEST_TIMEOUT_MS`            | No       | `30000`                           | Global request timeout in ms                     |
|                                 |         |                                   |                                                  |
| **AWS S3 (image uploads)**      |          |                                   |                                                  |
| `AWS_ACCESS_KEY_ID`             | Optional | —                                 | S3 access key (leave blank to skip)              |
| `AWS_SECRET_ACCESS_KEY`         | Optional | —                                 | S3 secret key                                    |
| `AWS_REGION`                    | No       | `us-east-1`                       | S3 bucket region                                 |
| `AWS_BUCKET_NAME`               | Optional | —                                 | S3 bucket name                                   |
| `AWS_SIGNED_URL_EXPIRES_IN_SECONDS` | No  | `3600`                            | Presigned URL TTL                                |
|                                 |         |                                   |                                                  |
| **AI Chat (optional)**          |          |                                   |                                                  |
| `AI_MODAL`                      | Optional | —                                 | Model identifier (e.g. `deepseek:deepseek-v4-pro`)|
| `AI_API_KEY`                    | Optional | —                                 | Provider API key                                 |
| `AI_BASE_URL`                   | Optional | —                                 | Provider base URL (e.g. `https://api.deepseek.com`)|
| `AI_MAX_OUTPUT_TOKENS`          | No       | `800`                             | Max tokens in AI response                        |
| `AI_REQUEST_TIMEOUT_MS`         | No       | `30000`                           | AI request timeout                               |

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env`.

| Variable              | Required | Default                          | Description           |
|-----------------------|----------|----------------------------------|-----------------------|
| `VITE_API_BASE_URL`   | Yes      | `http://localhost:3001/api`      | Backend API base URL  |

### Mobile App Environment Variables

Copy `app/.env.example` to `app/.env`.

| Variable                    | Required | Default                     | Description                  |
|-----------------------------|----------|-----------------------------|------------------------------|
| `EXPO_PUBLIC_APP_ENV`       | No       | `development`               | App environment label        |
| `EXPO_PUBLIC_API_URL`       | Yes      | `http://localhost:3000`     | Backend API base URL         |
| `EXPO_PUBLIC_PUBLIC_WEB_URL`| Yes      | `http://localhost:5173`     | Web URL used for public tree links |

## Available Scripts

### Backend (`yarn`)

| Command               | Description                            |
|-----------------------|----------------------------------------|
| `yarn dev`            | Start dev server with hot reload       |
| `yarn build`          | Compile TypeScript to `dist/`          |
| `yarn start`          | Run compiled server                    |
| `yarn migration:run`  | Apply pending database migrations      |
| `yarn migration:revert` | Revert the last migration            |
| `yarn migration:generate --name=MyChange` | Generate a new migration from entity changes |

To generate secure JWT secrets for your `.env` file:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (`npm`)

| Command            | Description                       |
|--------------------|-----------------------------------|
| `npm run dev`      | Start Vite dev server             |
| `npm run build`    | Build for production              |
| `npm run preview`  | Preview production build locally  |
| `npm run lint`     | Run ESLint                        |

### Mobile App (`npm`)

| Command                 | Description                              |
|-------------------------|------------------------------------------|
| `npm start`             | Start Expo for Expo Go                   |
| `npm run android`       | Start Expo on Android emulator/device    |
| `npm run ios`           | Start Expo on iOS simulator/device       |
| `npm run dev`           | Start Expo development build client      |
| `npm run typecheck`     | Run TypeScript validation                |
| `npm run lint`          | Run Expo ESLint                          |
| `npx expo install --check` | Validate Expo SDK dependency versions |

## Project Structure

```
myroots/
├── backend/                   # NestJS + TypeORM API
│   ├── src/
│   │   ├── common/            # Guards, decorators, filters, validators
│   │   ├── config/            # Database and app configuration
│   │   ├── entities/          # TypeORM entity classes
│   │   ├── migrations/        # Database migration files
│   │   ├── modules/           # Feature modules (auth, trees, persons, chat, storage)
│   │   ├── types/             # Shared TypeScript types
│   │   └── utils/             # ApiError, ApiResponse utilities
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── api/               # Axios API functions
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React context providers
│   │   ├── hooks/             # Custom hooks (api, forms, common)
│   │   ├── layouts/           # Page layouts
│   │   ├── lib/               # Axios instance, utilities
│   │   ├── pages/             # Route-level page components
│   │   ├── providers/         # Auth and data providers
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # Utility functions
│   │   └── validations/       # Zod validation schemas
│   ├── public/                # Static assets
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   └── nginx.conf
├── app/                       # Expo React Native mobile app
│   ├── app/                   # Expo Router routes
│   ├── src/
│   │   ├── api/               # Axios API functions
│   │   ├── components/        # Native reusable UI and feature components
│   │   ├── constants/         # Query keys, config, storage keys
│   │   ├── hooks/             # React Query hooks
│   │   ├── providers/         # Auth and toast providers
│   │   ├── screens/           # Route-level mobile screens
│   │   ├── services/          # Secure storage and native services
│   │   ├── theme/             # Colors, spacing, radius
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # Shared business logic helpers
│   │   └── validations/       # Zod validation schemas
│   ├── assets/
│   ├── package.json
│   ├── app.json
│   ├── eas.json
│   └── README.md
├── scripts/                   # Utility scripts
├── docker-compose.yml         # Full-stack Docker orchestration
├── .dockerignore
├── .nvmrc                     # Node version: 24
└── README.md
```

## API Overview

| Method   | Path                                      | Auth | Description                |
|----------|-------------------------------------------|------|----------------------------|
| `POST`   | `/api/auth/signup`                        | No   | Create account              |
| `POST`   | `/api/auth/login`                         | No   | Get access + refresh tokens |
| `GET`    | `/api/auth/me`                            | Yes  | Get current user            |
| `GET`    | `/api/trees`                              | Yes  | List user's trees           |
| `POST`   | `/api/trees`                              | Yes  | Create a tree               |
| `GET`    | `/api/trees/:treeId`                      | Yes  | Get tree details            |
| `PATCH`  | `/api/trees/:treeId`                      | Yes  | Update tree                 |
| `DELETE` | `/api/trees/:treeId`                      | Yes  | Delete tree                 |
| `GET`    | `/api/trees/:treeId/tree-view`            | Yes  | Get tree visualization data |
| `GET`    | `/api/trees/:treeId/persons`              | Yes  | List persons in tree        |
| `POST`   | `/api/trees/:treeId/persons`              | Yes  | Add person to tree          |
| `GET`    | `/api/trees/:treeId/persons/:personId`    | Yes  | Get person details          |
| `PATCH`  | `/api/trees/:treeId/persons/:personId`    | Yes  | Update person               |
| `DELETE` | `/api/trees/:treeId/persons/:personId`    | Yes  | Delete person               |
| `POST`   | `/api/trees/:treeId/chat`                 | Yes  | AI chat assistant           |

See [backend/README.md](backend/README.md) for detailed API documentation including the AI chatbot interface.

## Building & Running with Docker

### Build individual images

```bash
# Backend
docker build -t myroots-backend ./backend

# Frontend
docker build -t myroots-frontend ./frontend
```

### Run the full stack

```bash
# Start PostgreSQL, backend, and frontend together
docker compose up --build

# Run in detached mode
docker compose up -d --build
```

### Apply database migrations

```bash
# After the backend container is running
docker compose exec backend yarn migration:run
```

### View logs

```bash
docker compose logs -f backend
```

## License

[MIT](LICENSE)
