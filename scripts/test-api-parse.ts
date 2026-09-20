// Verifies parseJsonResponse turns non-JSON responses (like a hosting
// platform's 404 page "The page could not be found...") into clear errors
// instead of "Unexpected token 'T' ... is not valid JSON".
import { parseJsonResponse } from '../src/utils/api';

function makeRes(body: string, contentType: string, status = 404): Response {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

async function expectApiError(
  name: string,
  res: Response,
  mustContain: string
) {
  try {
    await parseJsonResponse(res);
    console.log(`FAIL [${name}]: no error thrown`);
    process.exitCode = 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const ok = msg.includes(mustContain) && !msg.includes('Unexpected token');
    console.log(
      `${ok ? 'PASS' : 'FAIL'} [${name}]: ${msg.slice(0, 140)}${ok ? '' : ` (missing "${mustContain}")`}`
    );
    if (!ok) process.exitCode = 1;
  }
}

async function expectOk(name: string, res: Response, expected: unknown) {
  const data = await parseJsonResponse<{ hello: string }>(res);
  const ok = JSON.stringify(data) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${name}]`);
  if (!ok) process.exitCode = 1;
}

await expectApiError(
  'vercel-style 404 page',
  makeRes('The page could not be found404: NOT_FOUND\nCode: `NOT_FOUND`', 'text/plain; charset=utf-8'),
  'The page could not be found'
);
await expectApiError(
  'html 404 page',
  makeRes('<html><body><h1>404 Not Found</h1></body></html>', 'text/html'),
  '404 Not Found'
);
await expectApiError(
  'malformed json',
  makeRes('{nope', 'application/json', 200),
  'malformed'
);
await expectOk('valid json', makeRes('{"hello":"world"}', 'application/json', 200), {
  hello: 'world',
});
