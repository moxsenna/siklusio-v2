import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== FIXING TIMESTAMPS FOR AUTHENTIC COMMUNITY PREVIEW ===");

  // 1. Fetch posts and comments so we can map them
  const { data: posts, error: postErr } = await supabase
    .from("community_posts")
    .select(`
      id,
      content,
      profiles (
        nickname
      )
    `);

  if (postErr) {
    console.error("Error fetching posts:", postErr);
    return;
  }

  const { data: comments, error: commentErr } = await supabase
    .from("community_comments")
    .select(`
      id,
      post_id,
      content,
      profiles (
        nickname
      )
    `);

  if (commentErr) {
    console.error("Error fetching comments:", commentErr);
    return;
  }

  // 2. Define natural times based on current date
  const now = Date.now();

  // Offset mappings:
  // Post 4 (Nisa - Fase Menstruasi): 12 minutes ago
  // Post 3 (Bunda Dian - Hamil 4 Bulan): 2 hours 15 minutes ago
  // Post 2 (Riana - Fase Luteal): 18 hours 40 minutes ago
  //   - Comment from Nisa: 18 hours 10 minutes ago (30 mins after post)
  // Post 1 (Fitri - Pejuang Promil): 2 days 4 hours ago
  //   - Comment from Riana: 2 days 3 hours 45 minutes ago (15 mins after post)
  //   - Comment from Bunda Dian: 2 days 3 hours 10 minutes ago (50 mins after post)

  const nisaPostTime = new Date(now - 12 * 60 * 1000); // 12 mins ago
  const dianPostTime = new Date(now - (2 * 60 + 15) * 60 * 1000); // 2h 15m ago
  const rianaPostTime = new Date(now - (18 * 60 + 40) * 60 * 1000); // 18h 40m ago
  const fitriPostTime = new Date(now - (2 * 24 + 4) * 60 * 60 * 1000); // 2d 4h ago

  console.log("Calculated natural post times (UTC/Local):");
  console.log(`- Nisa Post: ${nisaPostTime.toISOString()}`);
  console.log(`- Bunda Dian Post: ${dianPostTime.toISOString()}`);
  console.log(`- Riana Post: ${rianaPostTime.toISOString()}`);
  console.log(`- Fitri Post: ${fitriPostTime.toISOString()}`);

  // 3. Update Posts
  for (const post of posts) {
    let targetTime = null;
    const nickname = post.profiles?.nickname || "";

    if (nickname.includes("Nisa")) {
      targetTime = nisaPostTime;
    } else if (nickname.includes("Dian")) {
      targetTime = dianPostTime;
    } else if (nickname.includes("Riana")) {
      targetTime = rianaPostTime;
    } else if (nickname.includes("Fitri")) {
      targetTime = fitriPostTime;
    }

    if (targetTime) {
      const { error } = await supabase
        .from("community_posts")
        .update({ created_at: targetTime.toISOString() })
        .eq("id", post.id);

      if (error) {
        console.error(`Failed to update post timestamp for ${nickname}:`, error);
      } else {
        console.log(`✅ Updated post by ${nickname} to: ${targetTime.toISOString()}`);
      }
    }
  }

  // 4. Update Comments
  for (const comment of comments) {
    let targetTime = null;
    const commenterName = comment.profiles?.nickname || "";
    const commentText = comment.content || "";

    // Identify comments
    if (commentText.includes("Aamiin ya Allah")) {
      // Comment by Riana on Fitri's post (15 minutes after post)
      targetTime = new Date(fitriPostTime.getTime() + 15 * 60 * 1000);
    } else if (commentText.includes("kuncinya rileks")) {
      // Comment by Bunda Dian on Fitri's post (50 minutes after post)
      targetTime = new Date(fitriPostTime.getTime() + 50 * 60 * 1000);
    } else if (commentText.includes("H2H")) {
      // Comment by Nisa on Riana's post (30 minutes after post)
      targetTime = new Date(rianaPostTime.getTime() + 30 * 60 * 1000);
    }

    if (targetTime) {
      const { error } = await supabase
        .from("community_comments")
        .update({ created_at: targetTime.toISOString() })
        .eq("id", comment.id);

      if (error) {
        console.error(`Failed to update comment timestamp:`, error);
      } else {
        console.log(`✅ Updated comment by ${commenterName} to: ${targetTime.toISOString()}`);
      }
    }
  }

  console.log("=== TIMESTAMP CORRECTION FULLY COMPLETE ===");
}

main().catch(console.error);
