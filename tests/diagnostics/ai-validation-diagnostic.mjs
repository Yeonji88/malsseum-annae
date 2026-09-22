const endpointIndex = process.argv.indexOf('--endpoint');
const endpoint = endpointIndex >= 0 ? process.argv[endpointIndex + 1] : '';
if (!endpoint) throw new Error('Provide a Vercel preview URL with --endpoint. Production intentionally hides diagnostics.');

const messages = [
  '돈 걱정 때문에 잠이 안 와요',
  '나는 왜이렇게 못생겼을까요',
  '기도할수록 하나님이 침묵하시는 것 같아 답답해요',
  '불안해서 잠이 안 와요',
  '그 사람이 한 말이 화나서 잠이 안 와요'
];

const rows = [];
for (const input of messages) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/analyze`, {
    method: 'POST',
    headers: {
      Origin: 'https://yeonji88.github.io',
      'Content-Type': 'application/json',
      'X-Malsseum-Diagnostic': 'validation'
    },
    body: JSON.stringify({message: input}),
    signal: AbortSignal.timeout(25000)
  });
  const body = await response.json();
  rows.push({input, status: response.status, validated: response.ok, analysis: response.ok ? body : null, diagnostic: body.diagnostic || null, fallback: !response.ok});
  process.stdout.write(`${rows.length}/${messages.length}\r`);
}

process.stdout.write('\n');
console.log(JSON.stringify({endpoint, calls: rows.length, rows}, null, 2));
