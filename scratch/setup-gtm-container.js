/**
 * SIKLUSIO — AUTOMATED GTM CONTAINER SETUP SCRIPT
 * 
 * Script ini menggunakan Google Tag Manager REST API v2 (seperti yang didefinisikan
 * dalam skill gtm-api-management) untuk mengotomatisasikan pembuatan Variabel, 
 * Pemicu (Trigger), dan Tag pelacakan di dalam container GTM-PX5J3XBM Anda.
 * 
 * PRASYARAT:
 * 1. Jalankan `npm install googleapis` di root project Anda.
 * 2. Siapkan file kredensial Service Account Google Cloud di `./service-account.json`.
 * 3. Tambahkan email Service Account tersebut sebagai Administrator di dashboard GTM Anda.
 * 4. Jalankan script ini: `node scratch/setup-gtm-container.js`
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// GTM Config
const ACCOUNT_ID = '6357989403'; // Ganti dengan Account ID GTM Anda (angka)
const CONTAINER_ID = '253907610'; // Ganti dengan Container ID GTM Anda (angka)
const KEY_FILE_PATH = './service-account.json'; // Path ke Service Account JSON Anda

async function run() {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error(`\n❌ Error: File kredensial '${KEY_FILE_PATH}' tidak ditemukan.`);
    console.log(`Silakan unduh Service Account JSON dari GCP Console dan letakkan di root folder.\n`);
    process.exit(1);
  }

  if (ACCOUNT_ID === 'YOUR_GTM_ACCOUNT_ID' || CONTAINER_ID === 'YOUR_GTM_CONTAINER_ID') {
    console.error(`\n❌ Error: Harap ubah ACCOUNT_ID dan CONTAINER_ID di dalam script ini terlebih dahulu.`);
    console.log(`ID tersebut berupa angka yang bisa Anda temukan pada URL dashboard GTM Anda.`);
    console.log(`Contoh URL: https://tagmanager.google.com/#/admin/accounts/1234567/containers/9876543/`);
    console.log(`Dimana Account ID = 1234567, dan Container ID = 9876543.\n`);
    process.exit(1);
  }

  console.log('🌸 Memulai inisialisasi GTM API client...');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers'],
  });

  const tagmanager = google.tagmanager({
    version: 'v2',
    auth,
  });

  try {
    // 1. Ambil atau Buat Workspace baru khusus untuk Setup
    console.log('✨ Mencari workspace GTM...');
    const parentContainer = `accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}`;
    
    const workspacesResponse = await tagmanager.accounts.containers.workspaces.list({
      parent: parentContainer,
    });
    
    // Gunakan workspace default "Default Workspace" atau buat baru
    let workspace = workspacesResponse.data.workspace?.find(w => w.name === 'Default Workspace');
    if (!workspace) {
      console.log('Membuat workspace baru: API Setup Tracking...');
      const createWorkspaceRes = await tagmanager.accounts.containers.workspaces.create({
        parent: parentContainer,
        requestBody: {
          name: 'API Setup Tracking',
          description: 'Otomatis dibuat oleh asisten AI Antigravity untuk pelacakan Siklusio.'
        }
      });
      workspace = createWorkspaceRes.data;
    }

    const workspacePath = workspace.path; // Format: accounts/{accId}/containers/{conId}/workspaces/{workId}
    console.log(`✅ Menggunakan Workspace: "${workspace.name}" (ID: ${workspace.workspaceId})`);

    // Jeda waktu (helper) untuk menghindari rate limiting Google API
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ============================================================
    // 2. MEMBUAT DATA LAYER VARIABLES
    // ============================================================
    console.log('\n📦 Membuat Data Layer Variables...');
    const variablesToCreate = [
      { name: 'dlv - ref_code', key: 'ref_code' },
      { name: 'dlv - discount_label', key: 'discount_label' },
      { name: 'dlv - cta_location', key: 'cta_location' },
      { name: 'dlv - cta_text', key: 'cta_text' },
      { name: 'dlv - error_message', key: 'error_message' }
    ];

    const createdVariables = {};
    for (const v of variablesToCreate) {
      try {
        console.log(`-> Membuat variabel: ${v.name}`);
        const res = await tagmanager.accounts.containers.workspaces.variables.create({
          parent: workspacePath,
          requestBody: {
            name: v.name,
            type: 'v', // 'v' = Data Layer Variable
            parameter: [
              { type: 'template', key: 'name', value: v.key },
              { type: 'template', key: 'defaultValue', value: '' },
              { type: 'template', key: 'dataLayerVersion', value: '2' }
            ]
          }
        });
        createdVariables[v.key] = res.data.variableId;
        await delay(500); // Prevent rate limits
      } catch (err) {
        if (err.errors?.[0]?.reason === 'duplicate') {
          console.log(`⚠️ Variabel "${v.name}" sudah ada, dilewati.`);
        } else {
          console.error(`❌ Gagal membuat variabel ${v.name}:`, err.message);
        }
      }
    }

    // ============================================================
    // 3. MEMBUAT CUSTOM EVENT TRIGGERS
    // ============================================================
    console.log('\n⚡ Membuat Custom Event Triggers...');
    const triggersToCreate = [
      { name: 'Event - click_cta', event: 'click_cta' },
      { name: 'Event - referral_detected', event: 'referral_detected' },
      { name: 'Event - referral_validated', event: 'referral_validated' },
      { name: 'Event - begin_checkout', event: 'begin_checkout' },
      { name: 'Event - checkout_error', event: 'checkout_error' },
      { name: 'Event - purchase_initiated', event: 'purchase_initiated' }
    ];

    const createdTriggers = {};
    for (const t of triggersToCreate) {
      try {
        console.log(`-> Membuat trigger: ${t.name}`);
        const res = await tagmanager.accounts.containers.workspaces.triggers.create({
          parent: workspacePath,
          requestBody: {
            name: t.name,
            type: 'customEvent',
            customEventFilter: [
              {
                type: 'equals',
                parameter: [
                  { type: 'template', key: 'arg0', value: '_event' },
                  { type: 'template', key: 'arg1', value: t.event }
                ]
              }
            ]
          }
        });
        createdTriggers[t.event] = res.data.triggerId;
        await delay(500);
      } catch (err) {
        if (err.errors?.[0]?.reason === 'duplicate') {
          console.log(`⚠️ Trigger "${t.name}" sudah ada, dilewati.`);
        } else {
          console.error(`❌ Gagal membuat trigger ${t.name}:`, err.message);
        }
      }
    }

    // ============================================================
    // 4. MEMBUAT CONTOH TAG PELACAKAN (CUSTOM HTML)
    // ============================================================
    console.log('\n🏷️ Membuat Contoh Tag Pelacakan (Meta Pixel / Analytics Fallback)...');
    
    // Pastikan kita punya trigger ID untuk purchase_initiated
    const purchaseTriggerId = createdTriggers['purchase_initiated'];
    if (purchaseTriggerId) {
      try {
        console.log('-> Membuat Tag: HTML - Purchase Initiated Logger');
        await tagmanager.accounts.containers.workspaces.tags.create({
          parent: workspacePath,
          requestBody: {
            name: 'HTML - Purchase Initiated Logger',
            type: 'html',
            parameter: [
              { 
                type: 'template', 
                key: 'html', 
                value: `<script>
  console.log("GTM Tag Fired: User initiated purchase with coupon " + {{dlv - ref_code}});
  // Anda bisa menyisipkan Meta Pixel fbq('track', 'InitiateCheckout', ...) atau tag eksternal lain di sini!
</script>` 
              }
            ],
            firingTriggerId: [purchaseTriggerId]
          }
        });
        console.log('✅ Tag HTML - Purchase Initiated Logger berhasil dibuat!');
      } catch (err) {
        if (err.errors?.[0]?.reason === 'duplicate') {
          console.log('⚠️ Tag sudah ada, dilewati.');
        } else {
          console.error('❌ Gagal membuat tag:', err.message);
        }
      }
    }

    console.log('\n🎉 PROSES PENYIAPAN GTM SELESAI!');
    console.log('Silakan buka https://tagmanager.google.com/ untuk meninjau perubahan di Workspace Anda, lalu klik "Submit" untuk mempublikasikannya.');

  } catch (error) {
    console.error('\n❌ Terjadi kesalahan fatal:', error.message);
  }
}

run();
