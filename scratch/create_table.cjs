// Use @supabase/supabase-js to run raw SQL via RPC
// First, let's check what approach works

const https = require('https');

const SUPABASE_URL = 'ixopbrmewpjvpilwgjkf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4b3Bicm1ld3BqdnBpbHdnamtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI0NDU4MywiZXhwIjoyMDk0ODIwNTgzfQ.PAckit9LxFFiZw041_stCFQaexLVCWBnUpM8Dg1NNVc';

function doRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      method,
      hostname: SUPABASE_URL,
      path,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    if (bodyStr) {
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Step 1: Try creating table via pg-meta SQL endpoint (available in Supabase hosted)
  console.log('=== Step 1: Trying Supabase pg-meta SQL endpoint ===');
  const sql = `CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);`;
  
  // Try the pg-meta query endpoint
  const result = await doRequest('/pg/query', 'POST', { query: sql });
  console.log('pg-meta result:', result.status, result.body);
  
  if (result.status === 404) {
    console.log('\npg-meta endpoint not available. You need to run this SQL manually in the Supabase Dashboard SQL Editor.');
    console.log('\n========================================');
    console.log('MANUAL STEP REQUIRED:');
    console.log('========================================');
    console.log('Go to: https://supabase.com/dashboard/project/ixopbrmewpjvpilwgjkf/sql');
    console.log('And run the following SQL:\n');
    console.log(sql);
    console.log(`\nALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;\n`);
    console.log(`CREATE POLICY "Allow service_role full access"`);
    console.log(`  ON public.pending_registrations TO service_role`);
    console.log(`  USING (true)`);
    console.log(`  WITH CHECK (true);`);
    console.log('========================================');
  }
  
  // Step 2: Verify table existence
  console.log('\n=== Step 2: Verifying table existence ===');
  const verify = await doRequest('/rest/v1/pending_registrations?select=*&limit=1', 'GET');
  console.log('Table check:', verify.status, verify.body);
}

main().catch(console.error);
