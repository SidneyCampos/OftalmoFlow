#!/usr/bin/env bash
set -Eeuo pipefail

# ---------- UI ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

die() { echo -e "${RED}ERRO:${NC} $*" 1>&2; exit 1; }
ok()  { echo -e "${GREEN}OK:${NC} $*"; }
warn(){ echo -e "${YELLOW}AVISO:${NC} $*"; }
info(){ echo -e "${CYAN}INFO:${NC} $*"; }

# ---------- Checks ----------
command -v git >/dev/null 2>&1 || die "git não encontrado. Abra pelo Git Bash."
command -v node >/dev/null 2>&1 || die "node não encontrado."
command -v npm  >/dev/null 2>&1 || die "npm não encontrado."

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Você não está dentro de um repositório git."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || die "Você está na branch '$BRANCH'. Troque para 'main' com: git checkout main"

# ---------- Safety: local changes ----------
info "Verificando se existe alteração local no servidor..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Existem alterações locais no servidor."
  git status
  echo
  die "Pare aqui para não sobrescrever coisa local. Se quiser descartar alterações: git reset --hard"
fi

# ---------- Pull ----------
info "Puxando atualizações do GitHub (git pull origin main)..."
git pull origin main
ok "Pull concluído."

# ---------- Backend ----------
if [ -d "backend" ]; then
  info "Atualizando dependências do backend (npm install)..."
  cd backend
  npm install

  # Prisma: gera client (seguro mesmo sem mudanças)
  if [ -d "prisma" ]; then
    info "Gerando Prisma Client (npx prisma generate)..."
    npx prisma generate
  else
    warn "Pasta backend/prisma não encontrada. Pulando prisma generate."
  fi

  cd ..
else
  die "Pasta 'backend' não encontrada na raiz do projeto."
fi

# ---------- Frontend ----------
if [ -d "frontend" ]; then
  info "Atualizando dependências do frontend (npm install)..."
  cd frontend
  npm install
  cd ..
else
  die "Pasta 'frontend' não encontrada na raiz do projeto."
fi

ok "Atualização de arquivos e dependências concluída."

echo
warn "AGORA VOCÊ PRECISA REINICIAR MANUALMENTE OS DOIS 'npm run dev' (backend e frontend)."
info "Passo a passo recomendado (2 terminais separados):"
echo
echo "Terminal 1 (backend):"
echo "cd backend"
echo "npm run dev"
echo
echo "Terminal 2 (frontend):"
echo "cd frontend"
echo "npm run dev"
echo
info "Teste de saúde do backend:"
echo "curl http://127.0.0.1:3333/health"