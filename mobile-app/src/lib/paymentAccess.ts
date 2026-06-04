import type { User } from "@supabase/supabase-js";

export const PENDING_PAYMENT_STATUS = "pending_payment";

export function isPaymentPendingUser(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.siklusio_access_status === PENDING_PAYMENT_STATUS;
}
