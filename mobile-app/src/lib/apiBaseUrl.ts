export interface ResolveApiBaseUrlOptions {
  configured?: string | null;
  debuggerHost?: string | null;
  isDevelopment: boolean;
}

const assertHttpUrl = (value: string): string => {
  if (!/^https?:\/\//i.test(value)) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use http or https.');
  }

  return value.replace(/\/+$/, '');
};

const getDebuggerHostName = (debuggerHost: string): string => {
  if (!debuggerHost.trim()) return '';

  try {
    return new URL(`http://${debuggerHost}`).hostname;
  } catch {
    return debuggerHost.split(':')[0] || '';
  }
};

export function resolveApiBaseUrl({
  configured,
  debuggerHost,
  isDevelopment,
}: ResolveApiBaseUrlOptions): string {
  const trimmed = configured?.trim() || '';
  if (trimmed) {
    return assertHttpUrl(trimmed);
  }

  if (isDevelopment) {
    const host = getDebuggerHostName(debuggerHost || '');
    return host ? `http://${host}:3000` : 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is required for production builds. Set it to the deployed Siklusio API URL.'
  );
}
