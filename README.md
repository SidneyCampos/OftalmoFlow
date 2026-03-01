# OftalmoFlow (Recepção + Fila + Prontuário)

Este pacote vem com 2 pastas:
- `backend/` (Express + Prisma + PostgreSQL)
- `frontend/` (Vite + React)

## Rodar no computador (desenvolvimento)

### 1) Backend
1. Abra um terminal na pasta `backend/`
2. Instale dependências: `npm install`
3. Configure `backend/.env` (DATABASE_URL)
4. Rode: `npm run dev`

### 2) Frontend
1. Abra outro terminal na pasta `frontend/`
2. Instale dependências: `npm install`
3. Rode: `npm run dev`

O frontend abre em `http://localhost:3000` e conversa com o backend via proxy `/api`.
