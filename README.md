# ScrapeBrowser

**Self-hosted headless browser API for web scraping**  
Powered by Playwright – launch sessions, navigate, execute JS, screenshot, get HTML. No cloud bills, full control, privacy-first.

Alternative open-source/self-hosted à Browserless, Browserbase, ScrapingBee quand tu veux éviter les factures surprises et garder tes données chez toi.

### Features (v0.1)
- REST API simple & curl-friendly
- Session management (create / goto / eval / html / screenshot / close)
- Headless Chromium (Playwright)
- Docker-ready (coming soon)
- Stealth & proxy support planned (v0.2)

### Quick Start (Local dev)

```bash
# 1. Clone & install
git clone https://github.com/michaFry/scrape-browser.git
cd scrape-browser
bun install  # ou npm install

# 2. Run (dev mode)
bun dev  # ou npm run dev → watch mode
# API disponible sur http://localhost:4321
