import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function clean() {
  console.log("Cleaning community database tables...");
  
  // Delete all reports
  const { error: err1 } = await supabase.from("community_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (err1) console.error("Error deleting reports:", err1);
  else console.log("Deleted reports successfully.");

  // Delete all reactions
  const { error: err2 } = await supabase.from("community_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (err2) console.error("Error deleting reactions:", err2);
  else console.log("Deleted reactions successfully.");

  // Delete all comments
  const { error: err3 } = await supabase.from("community_comments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (err3) console.error("Error deleting comments:", err3);
  else console.log("Deleted comments successfully.");

  // Delete all posts
  const { error: err4 } = await supabase.from("community_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (err4) console.error("Error deleting posts:", err4);
  else console.log("Deleted posts successfully.");

  // Ensure admin user exists and is flagged as admin
  const adminEmail = "admin@siklusio.local";
  console.log(`Checking if admin user exists (${adminEmail})...`);
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing auth users:", listError);
    process.exit(1);
  }

  let adminUser = authUsers.users.find(u => u.email === adminEmail);
  if (!adminUser) {
    console.log("Admin user not found. Creating user in auth...");
    const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: "123456",
      email_confirm: true
    });
    if (createError) {
      console.error("Error creating admin user:", createError);
      process.exit(1);
    }
    adminUser = newAdmin.user;
    console.log("Admin user created with ID:", adminUser.id);
  } else {
    console.log("Admin user already exists in auth with ID:", adminUser.id);
  }

  // Ensure profiles table has admin user flagged as admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", adminUser.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error checking admin profile:", profileError);
  }

  if (!profile || !profile.is_admin) {
    console.log("Setting is_admin = true for admin profile...");
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: adminUser.id,
        name: "Admin",
        nickname: "Admin",
        is_admin: true
      });
    if (updateError) {
      console.error("Error updating admin profile:", updateError);
    } else {
      console.log("Admin profile set successfully.");
    }
  } else {
    console.log("Admin profile is already flagged as admin.");
  }
}

clean().catch(console.error);
