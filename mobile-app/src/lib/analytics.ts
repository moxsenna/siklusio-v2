export type EventParams = {
  [key: string]: unknown;
};

export function normalizeAnalyticsEventName(eventName: string): string {
  return eventName.trim().replace(/\s+/g, '_').toLowerCase();
}

export function buildAnalyticsEventPayload(eventName: string, params: EventParams = {}): EventParams {
  return {
    ...params,
    event: normalizeAnalyticsEventName(eventName),
  };
}

export function buildAnalyticsScreenViewPayload(screenName: string, screenClass?: string): EventParams {
  return {
    event: 'screen_view',
    screen_name: screenName,
    screen_class: screenClass || 'ReactNavigation',
  };
}

export function buildAnalyticsUserPayload(userId: string | null, properties: EventParams = {}): EventParams {
  return {
    event: 'user_properties_set',
    userId,
    ...properties,
  };
}

function isDevLoggingEnabled(): boolean {
  return Boolean((globalThis as { __DEV__?: boolean }).__DEV__);
}

function pushToDataLayer(payload: EventParams): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const browserWindow = window as Window & { dataLayer?: EventParams[] };
    browserWindow.dataLayer = browserWindow.dataLayer || [];
    browserWindow.dataLayer.push(payload);
  } catch (err) {
    console.error('[Analytics Error] Failed to push to dataLayer:', err);
  }
}

class AnalyticsManager {
  /**
   * Log a custom event.
   * GTM/dataLayer is the active analytics transport for web builds; native is a safe no-op for now.
   */
  async logEvent(eventName: string, params: EventParams = {}) {
    const payload = buildAnalyticsEventPayload(eventName, params);

    if (isDevLoggingEnabled()) {
      console.log(`[Analytics Event] ${String(payload.event)}:`, JSON.stringify(params, null, 2));
    }

    pushToDataLayer(payload);
  }

  /**
   * Log screen view / navigation transitions for GTM screen view tags.
   */
  async logScreenView(screenName: string, screenClass?: string) {
    const payload = buildAnalyticsScreenViewPayload(screenName, screenClass);

    if (isDevLoggingEnabled()) {
      console.log(`[Analytics ScreenView] Name: ${screenName}, Class: ${payload.screen_class}`);
    }

    pushToDataLayer(payload);
  }

  /**
   * Set safe user properties for audience segmentation.
   * Do not pass email, phone number, name, or health data here.
   */
  async setUser(userId: string | null, properties: EventParams = {}) {
    const payload = buildAnalyticsUserPayload(userId, properties);

    if (isDevLoggingEnabled()) {
      console.log(`[Analytics User] ID: ${userId}, Properties:`, JSON.stringify(properties));
    }

    pushToDataLayer(payload);
  }
}

export const analytics = new AnalyticsManager();
export default analytics;
