// Simulates what Vercel's runtime does with api/index.ts:
// imports the handler and calls it with (req, res).
import http from 'http';
import handler from '../api/index';

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(3444, async () => {
  const plan = await fetch('http://localhost:3444/api/ai/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: 'Delhi', destination: 'Jaipur', days: 2 }),
  });
  const json = await plan.json();
  console.log('plan.success:', json.success, '| source:', json.source);
  const health = await fetch('http://localhost:3444/api/health');
  console.log('health.status:', health.status, '| ok:', (await health.json()).status);
  const autocomplete = await fetch('http://localhost:3444/api/places/autocomplete?q=agra');
  const ac = await autocomplete.json();
  console.log('autocomplete.success:', ac.success, '| results:', ac.places?.length);
  server.close();
  process.exit(0);
});
