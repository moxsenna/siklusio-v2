const https = require('https');

const apiKey = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ZTMwYTBiNC0wODQxLTQ3OTktOGI4YS0yMjA2YWNiYzRlMWQiLCJhY2NvdW50SWQiOiI0Y2I2YTU1ZS0yOGEzLTQ1YTItYTkxNi02YjczN2M4NWNjOWQiLCJjcmVhdGVkQXQiOiIxNzc5NzIwMDI5NTk2Iiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYWRpZ2lrdWxAZ21haWwuY29tIiwibmFtZSI6IlNhcmFuZyBEaWdpdGFsIiwibGluayI6InNhcmFuZyIsImlzU2VsZkRvbWFpbiI6ZmFsc2UsImlhdCI6MTc3OTcyMDAyOX0.Ceo_XfuNtqt8-67QmSXdBpMVEhGtLl2AQ6mKLL3Jq2JCa_Ox2NHdYDt0_SqiU3dwolwUe93OO1QRlW0XMIVdXc3FW4hLbyHec6KqRtybOCc_ybLwR6tWKRTsC3xkAzoLvGXka8cSObJ_kjbkvlVbvMYByPR-2C_kcllzyQtdaGtj0CrW__XXpVwplbf7Wex-OnRmZKkfbq6PztXoHuSUc0CsN2DpHwdNIUsUSKwgIqnk-dCLoHaVJ_XLtd-ru-MlLGf8ITd76oJmzvsT4-XNlMG0BVP7fbmEDO_8DaJFsR3cJDRntQkEcG7gTJ5Y-N9Gna9GgRw9qTW0iEOUCnZjzQ";

const body = {
  name: "Siklusio Premium",
  amount: 37000,
  description: "Investasi Satu Kali untuk Teman Terbaik Perjalanan Promilmu. Dukungan AI Personal, Komunitas Hangat, dan Integrasi Suami demi Menjemput Garis Dua Tercinta.",
  redirectUrl: "https://siklusio.com/",
  email: "pembeli@siklusio.com",
  mobile: "081234567890"
};

const data = Buffer.from(JSON.stringify(body));

const opts = {
  method: 'POST',
  hostname: 'api.mayar.id',
  path: '/hl/v1/payment/create',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'User-Agent': 'mayar-cli/0.1.9'
  }
};

const req = https.request(opts, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", text);
  });
});

req.on('error', console.error);
req.write(data);
req.end();
