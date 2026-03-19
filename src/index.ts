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
  if (!session) return reply.code(404).send({ error: 'Session not found' });

  try {
    await session.page.goto(url, { waitUntil: waitUntil as any, timeout: 45000 });
    return { success: true };
  } catch (err: any) {
    return reply.code(400).send({ error: err.message });
  }
});

app.post('/session/:id/eval', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { script } = req.body as { script: string };

  const session = sessions.get(id);
  if (!session) return reply.code(404).send({ error: 'Session not found' });

  try {
    const result = await session.page.evaluate(script);
    return { result };
  } catch (err: any) {
    return reply.code(400).send({ error: err.message });
  }
});

app.get('/session/:id/html', async (req, reply) => {
  const { id } = req.params as { id: string };
  const session = sessions.get(id);
  if (!session) return reply.code(404).send({ error: 'Session not found' });

  const html = await session.page.content();
  return reply.type('text/html').send(html);
});

app.post('/session/:id/screenshot', async (req, reply) => {
  const { id } = req.params as { id: string };
  const session = sessions.get(id);
  if (!session) return reply.code(404).send({ error: 'Session not found' });

  const buffer = await session.page.screenshot({ fullPage: true, type: 'png' });
  return reply
    .type('image/png')
    .header('Content-Disposition', 'attachment; filename="screenshot.png"')
    .send(buffer);
});

// Bonus : healthcheck
app.get('/health', async () => ({ status: 'ok', sessions: sessions.size }));

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 4321, host: '0.0.0.0' });
    app.log.info(`Server listening on http://localhost:${app.server.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
