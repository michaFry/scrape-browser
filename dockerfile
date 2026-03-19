# Base image légère et récente (Node 20 Alpine pour petite taille + sécurité)
FROM node:20-alpine AS base

# Installe les dépendances système nécessaires pour Playwright (chromium, fonts, etc.)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Définit le répertoire de travail
WORKDIR /app

# Copie d'abord package.json et lockfile pour optimiser le cache Docker
COPY package*.json ./

# Installe les dépendances (production seulement pour image finale)
RUN npm ci --production

# Copie le reste du code source
COPY . .

# Expose le port de l'API (4321 par défaut)
EXPOSE 4321

# Commande de lancement (adapte si tu utilises Bun ou autre)
# Ici on utilise node classique (tu peux changer pour "bun run start" si Bun)
CMD ["node", "src/index.js"]
