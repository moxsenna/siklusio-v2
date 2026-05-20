import http from "http";

const data = JSON.stringify({
  phase: "Ovulasi",
  cycleDay: 14,
  daysToNextPeriod: 14,
  fertilityWindow: {
    start: "2026-05-15",
    end: "2026-05-20"
  },
  cycleData: {}
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-cycle-report',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk.toString());
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error('Error:', error));
req.write(data);
req.end();
