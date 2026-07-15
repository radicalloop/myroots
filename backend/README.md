# Family Tree Backend API

NestJS + TypeORM + PostgreSQL backend for the Family Tree MVP.

## Setup

```bash
cd backend
nvm use
yarn install
cp .env.example .env
# Edit .env with your PostgreSQL and AWS credentials
yarn migration:run
yarn dev
```

API runs at `http://localhost:3001/api`.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server with hot reload |
| `yarn build` | Compile for production |
| `yarn start` | Run compiled server |
| `yarn migration:run` | Apply database migrations |
| `yarn migration:revert` | Revert last migration |

## API Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/signup | No |
| POST | /api/auth/login | No |
| GET | /api/auth/me | Yes |
| GET/POST | /api/trees | Yes |
| GET/PATCH/DELETE | /api/trees/:treeId | Yes |
| GET | /api/trees/:treeId/tree-view | Yes |
| GET/POST | /api/trees/:treeId/persons | Yes |
| GET/PATCH/DELETE | /api/trees/:treeId/persons/:personId | Yes |
| GET/POST/PATCH/DELETE | /api/trees/:treeId/persons/:personId/image | Yes |
| POST | /api/trees/:treeId/persons/:personId/image/upload | Yes |
| GET | /api/trees/:treeId/persons/:personId/image/view | Yes |
| POST | /api/trees/:treeId/chat | Yes |

## AI Chatbot

`POST /api/trees/:treeId/chat` powers the in-app assistant.

- Auth + ownership are checked first (same as every other `:treeId` route).
- Request body: `{ "message": string, "image"?: { "data": string (base64), "content_type": string } }`.
- The assistant can only: answer questions about the current tree, add a person, or edit a person's details.
- Response: `{ "reply": string, "action": "NONE" | "ADD_PERSON" | "UPDATE_PERSON" | "BATCH", "person": Person | null }`.

Configure the provider in `.env`:

```bash
AI_MODAL=openai:gpt-4o-mini
AI_API_KEY=your-provider-api-key
AI_BASE_URL=
```
