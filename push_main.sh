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

# ---------- Status ----------
info "Verificando status do repositório..."
git status

# Sem mudanças? não faz commit/push
if git diff --quiet && git diff --cached --quiet; then
  warn "Nenhuma alteração para commitar."
  info "Se você só quer garantir que está sincronizado, rode:"
  echo "git pull origin main"
  exit 0
fi

# ---------- Commit message ----------
echo
read -r -p "Digite a mensagem do commit (ex: 'Melhora busca de pacientes'): " MSG
MSG="$(echo "$MSG" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
[ -n "$MSG" ] || die "Mensagem de commit vazia."

# ---------- Add, commit ----------
info "Adicionando arquivos (git add .)..."
git add .

info "Criando commit..."
git commit -m "$MSG"

# ---------- Push ----------
info "Enviando para o GitHub (git push origin main)..."
git push origin main

ok "Push concluído com sucesso."
info "Próximo passo (no servidor): rodar o script pull_main_server.sh"