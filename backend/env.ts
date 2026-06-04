export interface Env {
  OPENROUTER_API_KEY: string;
  OPENROUTER_FREE_MODEL?: string;
  OPENROUTER_PAID_MODEL?: string;
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  MAYAR_API_KEY: string;
  MAYAR_WEBHOOK_TOKEN?: string;
  META_PIXEL_ID?: string;
  META_CAPI_ACCESS_TOKEN?: string;
  META_GRAPH_API_VERSION?: string;
  META_TEST_EVENT_CODE?: string;
  META_TEST_MODE_SECRET?: string;
  ALLOWED_ORIGINS?: string;
}
