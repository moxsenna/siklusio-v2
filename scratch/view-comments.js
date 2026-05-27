import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: comments, error } = await supabase
    .from("community_comments")
    .select(`
      id,
      post_id,
      content,
      created_at,
      user_id,
      profiles (
        nickname
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return;
  }

  console.log("Comments count:", comments.length);
  for (const comment of comments) {
    console.log(`- Post ID: ${comment.post_id}`);
    console.log(`  User: ${comment.profiles?.nickname || "NULL"}`);
    console.log(`  Content: "${comment.content}"`);
  }

  const { data: reactions, error: rxError } = await supabase
    .from("community_reactions")
    .select("post_id, reaction_type, count")
    .neq("post_id", "00000000-0000-0000-0000-000000000000"); // select reactions

  const { data: rawRx, error: rawRxErr } = await supabase
    .from("community_reactions")
    .select("id, post_id, reaction_type, user_id");
  
  if (rawRxErr) {
    console.error("Error fetching reactions:", rawRxErr);
  } else {
    console.log("Reactions count:", rawRx.length);
    const postReactions = {};
    for (const rx of rawRx) {
      if (!postReactions[rx.post_id]) {
        postReactions[rx.post_id] = {};
      }
      postReactions[rx.post_id][rx.reaction_type] = (postReactions[rx.post_id][rx.reaction_type] || 0) + 1;
    }
    console.log("Reactions by post:", postReactions);
  }
}

main().catch(console.error);
