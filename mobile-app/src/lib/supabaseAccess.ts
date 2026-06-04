export const SUPABASE_NOT_CONFIGURED_ERROR = "Supabase belum terkonfigurasi.";

export type SupabaseClientStatus<TClient> =
  | { ready: true; client: TClient }
  | { ready: false; error: string };

export type AuthenticatedSupabaseClientStatus<TClient> =
  | { ready: true; client: TClient; userId: string }
  | { ready: false; error: string };

export interface AuthenticatedSupabaseClientStatusOptions {
  authError?: string;
  supabaseError?: string;
}

export function getSupabaseClientStatus<TClient>(
  client: TClient | null | undefined,
): SupabaseClientStatus<TClient> {
  if (!client) {
    return { ready: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }

  return { ready: true, client };
}

export function requireSupabaseClient<TClient>(client: TClient | null | undefined): TClient {
  const status = getSupabaseClientStatus(client);
  if (!status.ready) {
    throw new Error(status.error);
  }

  return status.client;
}

export function getAuthenticatedSupabaseClientStatus<TClient>(
  client: TClient | null | undefined,
  userId: string | null | undefined,
  options: AuthenticatedSupabaseClientStatusOptions = {},
): AuthenticatedSupabaseClientStatus<TClient> {
  const status = getSupabaseClientStatus(client);
  if (!status.ready) {
    return { ready: false, error: options.supabaseError ?? status.error };
  }

  if (!userId) {
    return { ready: false, error: options.authError ?? "Anda belum login." };
  }

  return { ready: true, client: status.client, userId };
}

type SupabaseSessionClient = {
  auth: {
    getSession: () => Promise<{
      data?: {
        session?: {
          access_token?: string | null;
        } | null;
      } | null;
    }>;
  };
};

export async function getSupabaseAccessToken<TClient extends SupabaseSessionClient>(
  client: TClient | null | undefined,
): Promise<string | null> {
  const status = getSupabaseClientStatus(client);
  if (!status.ready) {
    return null;
  }

  const { data } = await status.client.auth.getSession();
  return data?.session?.access_token ?? null;
}
