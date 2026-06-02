import type { EventParams } from './analytics';

const PENDING_PAYMENT_STATUS = 'pending_payment';
const ACTIVE_STATUS = 'active';

type AnalyticsUser = {
  [key: string]: any;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
} | null | undefined;

export function buildAnalyticsUserProperties(user: AnalyticsUser): EventParams {
  if (!user) return {};

  const accessStatus =
    typeof user.app_metadata?.siklusio_access_status === 'string'
      ? user.app_metadata.siklusio_access_status
      : ACTIVE_STATUS;
  const authProvider =
    typeof user.app_metadata?.provider === 'string'
      ? user.app_metadata.provider
      : 'unknown';

  return {
    access_status: accessStatus,
    auth_provider: authProvider,
    is_payment_pending: accessStatus === PENDING_PAYMENT_STATUS,
  };
}
