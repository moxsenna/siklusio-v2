import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log("Listing users...");
  let page = 1;
  while (true) {
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });
    if (listError) {
      console.error("List users error:", listError);
      break;
    }
    const users = authUsers?.users || [];
    if (users.length === 0) break;
    console.log(`Page ${page}: ${users.length} users`);
    for (const u of users) {
      console.log(`- ID: ${u.id}, Email: ${u.email}`);
    }
    if (users.length < 100) break;
    page++;
  }
}

main().catch(console.error);
