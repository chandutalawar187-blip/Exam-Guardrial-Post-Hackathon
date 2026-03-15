// dashboard/public/service-worker.js

const AI_API_DOMAINS = [
  'api.openai.com', 'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.groq.com', 'api.cohere.ai',
  'api.mistral.ai', 'api.perplexity.ai'
];

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAiApi = AI_API_DOMAINS.some(d => url.hostname.includes(d));

  if (isAiApi) {
    // Notify all clients about the AI API call
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        clientList.forEach(client => client.postMessage({
          type: 'AI_API_CALL_DETECTED',
          domain: url.hostname,
          severity: 'CRITICAL',
          score_delta: -35
        }));
      })
    );
  }

  // Always let the request through
  // (we monitor, not block, at this layer)
});
