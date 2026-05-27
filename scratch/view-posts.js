import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: posts, error } = await supabase
    .from("community_posts")
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles (
        name,
        nickname,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  console.log("Posts count:", posts.length);
  for (const post of posts) {
    console.log(`[${post.id}]`);
    console.log(`User ID: ${post.user_id}`);
    console.log(`User Nickname: ${post.profiles?.nickname || "NULL"}`);
    console.log(`Content: "${post.content}"`);
    console.log(`Created: ${post.created_at}`);
    console.log("------------------------");
  }
}

main().catch(console.error);
