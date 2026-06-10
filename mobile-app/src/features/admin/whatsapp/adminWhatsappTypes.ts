export type EventKey = "registration_completed" | "payment_completed";

export interface AutoresponderSetting {
  id: string;
  event_key: EventKey;
  title: string;
  description: string | null;
  is_enabled: boolean;
  message_template: string;
  send_delay_seconds: number;
}

export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface DeliveryLog {
  id: string;
  event_key: string;
  recipient_whatsapp: string;
  recipient_name: string | null;
  rendered_message: string;
  status: DeliveryStatus;
  provider: string;
  provider_request_id: string | null;
  provider_message_id: string | null;
  provider_response: unknown;
  error_message: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export type StatusFilter = "all" | DeliveryStatus;
export type EventFilter = "all" | EventKey;

export interface SettingsResponse {
  settings: AutoresponderSetting[];
  placeholders: string[];
}

export interface LogsResponse {
  logs: DeliveryLog[];
}

export interface PreviewResponse {
  preview: string;
  warnings?: string[];
}

export interface SaveSettingResponse {
  setting: AutoresponderSetting;
}

export interface TestSendResponse {
  status: string;
}

export interface TextSelection {
  start: number;
  end: number;
}