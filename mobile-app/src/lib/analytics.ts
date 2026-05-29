import { Platform } from 'react-native';

// Safe dynamic import for Firebase Analytics to prevent crashes in Expo Go
let firebaseAnalytics: any = null;

try {
  // If native firebase analytics is installed, import it
  // In Expo Go or standard builds without native modules, this will fail gracefully
  const firebaseAnalyticsModule = require('@react-native-firebase/analytics');
  firebaseAnalytics = firebaseAnalyticsModule.default;
} catch (e) {
  // Graceful degradation when package is not available
  if (__DEV__) {
    console.log('[Analytics] Firebase Analytics package not found. Running in fallback mode.');
  }
}

export type EventParams = {
  [key: string]: any;
};

class AnalyticsManager {
  private isInitialized = false;

  constructor() {
    this.isInitialized = !!firebaseAnalytics;
  }

  /**
   * Log a custom event
   * @param eventName Name of the event (snake_case is recommended for GTM/GA4)
   * @param params Key-value pairs of metadata
   */
  async logEvent(eventName: string, params: EventParams = {}) {
    // Sanitise event name (replace spaces with underscores, lowercase)
    const sanitizedName = eventName.trim().replace(/\s+/g, '_').toLowerCase();

    // Log to console in development mode
    if (__DEV__) {
      console.log(`📊 [Analytics Event] ${sanitizedName}:`, JSON.stringify(params, null, 2));
    }

    if (Platform.OS === 'web') {
      try {
        const dataLayer = (window as any).dataLayer || [];
        dataLayer.push({
          event: sanitizedName,
          ...params
        });
      } catch (err) {
        console.error('[Analytics Error] Failed to push to dataLayer:', err);
      }
    }

    if (firebaseAnalytics) {
      try {
        await firebaseAnalytics().logEvent(sanitizedName, params);
      } catch (err) {
        console.error('[Analytics Error] Failed to log event to Firebase:', err);
      }
    }
  }

  /**
   * Log screen view / navigation transitions (mappable to GTM Screen Views)
   * @param screenName Screen route or path (e.g. '/(tabs)/calendar')
   * @param screenClass Component class or category (e.g. 'calendar')
   */
  async logScreenView(screenName: string, screenClass?: string) {
    if (__DEV__) {
      console.log(`📱 [Analytics ScreenView] Name: ${screenName}, Class: ${screenClass}`);
    }

    if (Platform.OS === 'web') {
      try {
        const dataLayer = (window as any).dataLayer || [];
        dataLayer.push({
          event: 'screen_view',
          screen_name: screenName,
          screen_class: screenClass || 'ReactNavigation'
        });
      } catch (err) {
        console.error('[Analytics Error] Failed to push screen view to dataLayer:', err);
      }
    }

    if (firebaseAnalytics) {
      try {
        await firebaseAnalytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass || 'ReactNavigation',
        });
      } catch (err) {
        console.error('[Analytics Error] Failed to log screen view:', err);
      }
    }
  }

  /**
   * Set user properties for audience segmentation in GTM/GA4
   * @param userId The authenticated user's ID
   * @param properties Custom dimensions (e.g. subscription_status: 'premium')
   */
  async setUser(userId: string | null, properties: EventParams = {}) {
    if (__DEV__) {
      console.log(`👤 [Analytics User] ID: ${userId}, Properties:`, JSON.stringify(properties));
    }

    if (Platform.OS === 'web') {
      try {
        const dataLayer = (window as any).dataLayer || [];
        dataLayer.push({
          event: 'user_properties_set',
          userId: userId,
          ...properties
        });
      } catch (err) {
        console.error('[Analytics Error] Failed to push user properties to dataLayer:', err);
      }
    }

    if (firebaseAnalytics) {
      try {
        if (userId) {
          await firebaseAnalytics().setUserId(userId);
        } else {
          await firebaseAnalytics().setUserId(null);
        }

        for (const [key, value] of Object.entries(properties)) {
          await firebaseAnalytics().setUserProperty(key, value ? String(value) : null);
        }
      } catch (err) {
        console.error('[Analytics Error] Failed to set user properties:', err);
      }
    }
  }
}

export const analytics = new AnalyticsManager();
export default analytics;
