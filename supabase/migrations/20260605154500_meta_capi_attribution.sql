-- Migration: Add Meta CAPI attribution and tracking to checkout_sessions
ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS lead_event_id TEXT,
  ADD COLUMN IF NOT EXISTS fbp TEXT,
  ADD COLUMN IF NOT EXISTS fbc TEXT,
  ADD COLUMN IF NOT EXISTS client_ip_address TEXT,
  ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS hashed_email TEXT,
  ADD COLUMN IF NOT EXISTS hashed_phone TEXT,
  ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT,
  ADD COLUMN IF NOT EXISTS purchase_capi_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS purchase_capi_event_id TEXT;

-- Unique index for purchase CAPI event id to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_purchase_capi_event_id_unique
  ON public.checkout_sessions(purchase_capi_event_id)
  WHERE purchase_capi_event_id IS NOT NULL;

-- Unique index for mayar transaction id in checkout_sessions to enforce payment uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_mayar_tx_unique
  ON public.checkout_sessions(mayar_transaction_id)
  WHERE mayar_transaction_id IS NOT NULL;
