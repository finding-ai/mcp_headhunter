FROM node:18-bullseye

# Installer les dépendances système pour Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier package.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Installer les navigateurs Playwright
RUN npx playwright install chromium

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 10000

# Démarrer le serveur
CMD ["npm", "start"]