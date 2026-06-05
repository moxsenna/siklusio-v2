# Spec: WhatsApp Autoresponder Admin Integration via Fonnte API

This document specifies the design, database schema, service logic, controller endpoints, and Mobile UI panel for managing automated WhatsApp notifications (autoresponders) in Siklusio.

---

## 1. Goals & Non-Blocking Design
* **Primary Goal**: Automatically send contextual, warm, and empathetic WhatsApp messages (addressing users as "Bunda") when registration is completed and when payment access is activated.
* **Side-Effect Isolation**: Since WhatsApp messaging is a secondary channel, failures in the Fonnte API must never block or fail the primary flows (checkout registrations, payment webhooks, or admin manual overrides).
* **Asynchronous Execution**: Deliveries are fired asynchronously. If available, Cloudflare Workers' `c.executionCtx.waitUntil()` keeps the task alive after sending the HTTP response.
* **Idempotency**: Prevent double delivery of the same event using a database-level unique constraint and checks before API execution.

---

## 2. Database Schema

A new migration `supabase/migrations/<timestamp>_whatsapp_autoresponder.sql` will implement the following:

### Types & Constraints
* **Enums**:
  * `whatsapp_autoresponder_event` = `('registration_completed', 'payment_completed')`
  * `whatsapp_autoresponder_log_status` = `('pending', 'sent', 'failed', 'skipped')`
* **Message Length constraint**: Setting templates must be between 20 and 60,000 characters.

### `whatsapp_autoresponder_settings`
```sql
create table if not exists public.whatsapp_autoresponder_settings (
  id uuid primary key default gen_random_uuid(),
  event_key public.whatsapp_autoresponder_event not null unique,
  title text not null,
  description text,
  is_enabled boolean not null default false,
  message_template text not null,
  send_delay_seconds integer not null default 0 check (send_delay_seconds >= 0 and send_delay_seconds <= 86400),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_template_length_check check (char_length(message_template) between 20 and 60000)
);
```

### `whatsapp_autoresponder_logs`
```sql
create table if not exists public.whatsapp_autoresponder_logs (
  id uuid primary key default gen_random_uuid(),
  event_key public.whatsapp_autoresponder_event not null,
  recipient_whatsapp text not null,
  recipient_name text,
  rendered_message text not null,
  status public.whatsapp_autoresponder_log_status not null default 'pending',
  provider text not null default 'fonnte',
  provider_request_id text,
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
```

### Indexes
* `whatsapp_autoresponder_logs_created_idx` on `(created_at desc)`
* `whatsapp_autoresponder_logs_event_created_idx` on `(event_key, created_at desc)`
* `whatsapp_autoresponder_logs_status_created_idx` on `(status, created_at desc)`

### Triggers
Triggers to update `updated_at` on both tables:
* `trg_whatsapp_autoresponder_settings_updated_at`
* `trg_whatsapp_autoresponder_logs_updated_at`

### RLS Policies
* **Settings**: Read and manage by admins (`public.is_admin(auth.uid())`).
* **Logs**:
  * Read by admins (`public.is_admin(auth.uid())`).
  * Admin has NO update/delete/insert permissions from client (read-only audit trail).
  * Backend processes write and mutate via `service_role` (ALL operations permitted).

---

## 3. Fonnte Service (`backend/src/services/fonnte.ts`)

### Phone Number Normalization
Clean non-numeric characters. Standardize Indonesia's prefix:
* If starts with `0`, strip `0` and keep remainder (e.g. `0812...` -> `812...`).
* If starts with `62`, strip `62` and keep remainder (e.g. `62812...` -> `812...`).
* Fonnte API will receive this clean number alongside `countryCode=62`.

### Placeholder Rendering
Valid placeholders: `nama`, `email`, `no_hp`, `link_pembayaran`, `jumlah_pembayaran`, `status_pembayaran`, `kode_kupon`, `kode_affiliate`, `link_login`, `tanggal`, `transaction_id`.
* Unknown key: Render `[placeholder_tidak_valid:key]`.
* Allowed key but missing/null value: Render `"-"`.

### Live Sending API Wrapper (`sendFonnteMessage`)
* **Endpoint**: `https://api.fonnte.com/send`
* **Authorization**: Header `Authorization` = `FONNTE_TOKEN` (raw value).
* **Payload**: Form Data containing target, message, countryCode, typing=true, preview=true.
* **Internal Timeout**: 10 seconds using `AbortController`.
* **Security**: `provider_response` holds the parsed JSON response body only, never request headers/secrets.

### Autoresponder Execution Flow (`sendWhatsappAutoresponder`)
1. Normalize number. If empty, return status `skipped` with reason.
2. Check DB log for `idempotency_key`. If exists, skip.
3. Fetch setting for `event_key`.
4. If setting is missing, insert a skipped/failed log with `rendered_message = "[setting_not_found]"` and return skipped.
5. Render template using the fetched setting's `message_template` and provided context.
6. If setting is disabled, insert a log with status `skipped`, populated `rendered_message`, and metadata reason `setting_disabled`, then return skipped.
7. If setting is enabled, insert a log with status `pending` and populated `rendered_message`.
8. Catch unique key violation on insert (database race condition) and skip gracefully if it occurs.
9. Call `sendFonnteMessage` with a 10s timeout.
10. Update DB log:
    * **Success**: status `sent`, populate `provider_request_id`, `provider_message_id`, and `provider_response`.
    * **Failure**: status `failed`, populate `error_message`.

---

## 4. Admin API & Routes

All routes registered under `backend/src/routes/admin.route.ts` and require the `requireAdmin` middleware.

* **`GET /api/admin/whatsapp/settings`**
  * Returns autoresponder settings list ordered statically (first `registration_completed`, second `payment_completed`).
  * Returns allowed placeholders array.
* **`PATCH /api/admin/whatsapp/settings/:eventKey`**
  * Explicitly extracts and validates update fields (`is_enabled`, `message_template`, `send_delay_seconds`).
  * Saves updates, records `updated_by`.
* **`POST /api/admin/whatsapp/preview`**
  * Renders a custom template in real-time with mock data.
  * Validates max length (60,000 chars). Returns warning if empty.
* **`POST /api/admin/whatsapp/test`**
  * Sends dummy template live to a designated target (requires eventKey).
  * Returns full provider JSON status to aid admin debugging.
* **`GET /api/admin/whatsapp/logs`**
  * Retrieves latest 100 logs.
  * Supports status and event filtering (`status`, `event` query parameters) and validates inputs.

---

## 5. React Native Admin Panel (`mobile-app/src/features/admin/AdminWhatsappAutoresponderPanel.tsx`)

### State & Logic
* **Editor**: Load last saved server config. Changes remain local until saved. Clicking "Reset Perubahan" drops unsaved states.
* **Debounced Preview**: Real-time rendering with 500-800ms debounce when template text changes.
* **Placeholder Chips**: Clicking a chip inserts the keyword at the cursor position (falls back to appending if cursor selection is unavailable).
* **Logs Panel**: Server-side filtering when dropdown selectors change (`status` and `event`).
* **Collapsible Views**:
  * Logs render snippet (first 150 chars) with a "Lihat Selengkapnya" trigger for the full message.
  * Failed/Skipped logs show an expandable segment showing the specific error/skipped reason.

### Branding Alignment
* **Primary Color**: Pink `#ec4899`
* **Accent Colors**: Violet `#9333ea`, Teal `#14b8a6`
* **Status Badges**:
  * `sent` -> Teal / Green
  * `failed` -> Red / Pink
  * `skipped` -> Gray / Slate
  * `pending` -> Amber / Yellow
