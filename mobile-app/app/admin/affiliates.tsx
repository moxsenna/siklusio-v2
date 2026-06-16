import { Redirect } from "expo-router";

/**
 * /admin/affiliates → redirect to /admin?tab=affiliates
 * The admin dashboard reads the `tab` query param to activate the correct panel.
 */
export default function AdminAffiliatesRedirect() {
  return <Redirect href="/admin?tab=affiliates" />;
}
