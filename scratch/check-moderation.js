import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  console.log('Fetching community reports...');
  const res = await fetch(`${supabaseUrl}/rest/v1/community_reports?select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const reports = await res.json();
  console.log('REPORTS count:', reports.length);
  console.log(JSON.stringify(reports, null, 2));

  console.log('\nFetching community posts...');
  const resPosts = await fetch(`${supabaseUrl}/rest/v1/community_posts?select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const posts = await resPosts.json();
  console.log('POSTS count:', posts.length);
  console.log(JSON.stringify(posts, null, 2));

  console.log('\nFetching community comments...');
  const resComments = await fetch(`${supabaseUrl}/rest/v1/community_comments?select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const comments = await resComments.json();
  console.log('COMMENTS count:', comments.length);
  console.log(JSON.stringify(comments, null, 2));
}

check().catch(console.error);
