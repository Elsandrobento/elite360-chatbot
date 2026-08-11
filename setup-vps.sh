#!/bin/bash
# ============================================================
# setup-vps.sh — Script de instalação automática do Kixi IA
# Testado em: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
# ============================================================
# Como usar:
#   chmod +x setup-vps.sh
#   ./setup-vps.sh
# ============================================================

set -e  # Para se houver qualquer erro

echo ""
echo "======================================================"
echo "  Kixi IA — Instalação Automática no VPS Hostinger"
echo "======================================================"
echo ""

# 1. Atualizar o sistema
echo "[1/9] A atualizar o sistema..."
apt-get update -y
apt-get upgrade -y

# 2. Instalar dependências essenciais do sistema
echo "[2/9] A instalar dependências essenciais..."
apt-get install -y \
  curl \
  wget \
  git \
  ca-certificates \
  gnupg \
  lsb-release \
  unzip \
  htop

# 3. Instalar Node.js 20 (versão LTS estável)
echo "[3/9] A instalar Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "   Node.js versão: $(node --version)"
echo "   npm versão: $(npm --version)"

# 4. Instalar dependências do Chromium (necessárias para o Puppeteer/WhatsApp Web)
echo "[4/9] A instalar dependências do Chromium..."
apt-get install -y \
  chromium-browser \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libxkbcommon0 2>/dev/null || true

echo "   Chromium versão: $(chromium-browser --version 2>/dev/null || chromium --version 2>/dev/null || echo 'verificar manualmente')"

# 5. Instalar PM2 (gestor de processos para manter o bot a correr 24/7)
echo "[5/9] A instalar PM2..."
npm install -g pm2
echo "   PM2 versão: $(pm2 --version)"

# 6. Criar pasta do projeto e clonar o repositório
echo "[6/9] A clonar o projeto do GitHub..."
mkdir -p /opt/kixi-ia
cd /opt/kixi-ia

if [ -d ".git" ]; then
  echo "   Repositório já existe. A atualizar..."
  git pull origin main
else
  git clone https://github.com/Elsandrobento/elite360-chatbot.git .
fi

# 7. Instalar dependências Node.js do projeto
echo "[7/9] A instalar dependências do projeto..."
npm install --production

# 8. Criar pasta de logs
mkdir -p logs

# 9. Configurar o Chromium para o Puppeteer
echo "[8/9] A configurar Chromium para Puppeteer..."
CHROMIUM_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "")

if [ -n "$CHROMIUM_PATH" ]; then
  echo "   Chromium encontrado em: $CHROMIUM_PATH"

  # Adicionar ao .env se não existir ainda
  if [ -f ".env" ]; then
    if ! grep -q "PUPPETEER_EXECUTABLE_PATH" .env; then
      echo "PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH" >> .env
    fi
  fi
else
  echo "   ⚠️  Chromium não encontrado. Puppeteer usará o Chromium bundled."
fi

# Resultado final
echo ""
echo "======================================================"
echo "[9/9] Instalação concluída!"
echo ""
echo "PRÓXIMO PASSO: Configurar o ficheiro .env"
echo ""
echo "Execute:"
echo "  cd /opt/kixi-ia"
echo "  nano .env"
echo ""
echo "Adicione:"
echo "  GEMINI_API_KEY=a_sua_chave_gemini_aqui"
echo "  MANAGER_NUMBER=244XXXXXXXXX@c.us"
if [ -n "$CHROMIUM_PATH" ]; then
  echo "  PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH"
fi
echo ""
echo "Depois inicie o bot:"
echo "  pm2 start ecosystem.config.cjs"
echo "  pm2 save"
echo "  pm2 startup"
echo "======================================================"
