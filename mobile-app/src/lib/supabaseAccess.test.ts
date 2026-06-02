import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  SUPABASE_NOT_CONFIGURED_ERROR,
  getAuthenticatedSupabaseClientStatus,
  getSupabaseAccessToken,
  getSupabaseClientStatus,
  requireSupabaseClient,
} from './supabaseAccess';

test('getSupabaseClientStatus returns unconfigured status for null clients', () => {
  const status = getSupabaseClientStatus(null);

  assert.equal(status.ready, false);
  assert.equal(status.error, SUPABASE_NOT_CONFIGURED_ERROR);
});

test('getSupabaseClientStatus returns ready status for configured clients', () => {
  const client = { auth: { getUser: async () => ({}) } };
  const status = getSupabaseClientStatus(client);

  assert.equal(status.ready, true);
  if (status.ready) {
    assert.equal(status.client, client);
  }
});

test('requireSupabaseClient throws a consistent configuration error', () => {
  assert.throws(
    () => requireSupabaseClient(undefined),
    new Error(SUPABASE_NOT_CONFIGURED_ERROR)
  );
});

test('getSupabaseAccessToken returns null when client is unconfigured', async () => {
  assert.equal(await getSupabaseAccessToken(null), null);
});

test('getSupabaseAccessToken returns the current session access token', async () => {
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            access_token: 'access-token-1',
          },
        },
      }),
    },
  };

  assert.equal(await getSupabaseAccessToken(client), 'access-token-1');
});

test('getAuthenticatedSupabaseClientStatus returns ready status with client and user id', () => {
  const client = { from: () => ({}) };
  const status = getAuthenticatedSupabaseClientStatus(client, 'user-1');

  assert.equal(status.ready, true);
  if (status.ready) {
    assert.equal(status.client, client);
    assert.equal(status.userId, 'user-1');
  }
});

test('getAuthenticatedSupabaseClientStatus returns auth error when user id is missing', () => {
  const client = { from: () => ({}) };
  const status = getAuthenticatedSupabaseClientStatus(client, null);

  assert.equal(status.ready, false);
  assert.equal(status.error, 'Anda belum login.');
});

test('getAuthenticatedSupabaseClientStatus supports a custom unconfigured client message', () => {
  const status = getAuthenticatedSupabaseClientStatus(null, 'user-1', {
    supabaseError: 'Konfigurasi Supabase belum tersedia di aplikasi.',
  });

  assert.equal(status.ready, false);
  assert.equal(status.error, 'Konfigurasi Supabase belum tersedia di aplikasi.');
});
