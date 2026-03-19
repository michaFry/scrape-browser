import fastify from 'fastify';
import { chromium, Browser, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = fastify({ logger: true });

// Stockage en mémoire (pour une vraie prod → redis)
const sessions = new Map<string, { browser: Browser; page: Page }>();

app.post('/session', async (req, reply) => {
  const id = uuidv4();

  try {
    const browser = await chromium.launch({
      headless: true,
      // Pour du stealth → ajouter playwright-extra + stealth plugin plus tard
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 ...', // optionnel
      locale: 'fr-FR',
    });

    const page = await context.newPage();

    sessions.set(id, { browser, page });

    return reply.code(201).send({ sessionId: id });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ error: 'Failed to create session' });
  }
});

app.delete('/session/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const session = sessions.get(id);

  if (!session) {
    return reply.code(404).send({ error: 'Session not found' });
  }

  try {
    await session.page.close();
    await session.browser.close();
    sessions.delete(id);
    return { success: true };
  } catch (err) {
    return reply.code(500).send({ error: 'Failed to close session' });
  }
});

app.post('/session/:id/goto', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { url, waitUntil = 'load' } = req.body as { url: string; waitUntil?: string };

  const session = sessions.get(id);
  if (!session) return reply.code(404).send({ error:
