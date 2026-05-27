import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, avatar_kind")
    .in("nickname", [
      "Fitri (Pejuang Promil)",
      "Riana (Fase Luteal)",
      "Bunda Dian (Hamil 4 Bulan)",
      "Nisa (Fase Menstruasi)"
    ]);

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  console.log("Profiles found:", profiles.length);
  for (const prof of profiles) {
    console.log(`- Nickname: ${prof.nickname}`);
    console.log(`  Avatar URL: ${prof.avatar_url}`);
    console.log(`  Avatar Kind: ${prof.avatar_kind}`);
  }
}

main().catch(console.error);
