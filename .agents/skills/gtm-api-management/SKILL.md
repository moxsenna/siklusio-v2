---
name: GTM API Management
description: Mengelola Google Tag Manager (GTM) secara programmatis menggunakan Google Tag Manager REST API v2 untuk membuat workspace, variabel, pemicu (trigger), dan tag pelacakan.
---

# GTM API Management Skill

Skill ini membantu agen untuk berinteraksi dengan **Google Tag Manager REST API v2** secara otomatis. Ini sangat berguna untuk memigrasikan atau memasang struktur tracking (Tags, Triggers, Variables) secara instan ke container GTM pengguna tanpa harus melakukan klik manual di dashboard web GTM.

## Autentikasi API

Untuk menggunakan GTM API, Anda membutuhkan akses ke Google Cloud Platform (GCP) dengan langkah berikut:
1. Aktifkan **Google Tag Manager API** di GCP Console.
2. Buat **Service Account** atau kredensial **OAuth2 Client ID**.
3. Download file kunci JSON Service Account (misalnya `service-account.json`).
4. **PENTING**: Di dalam dashboard web GTM, tambahkan email Service Account tersebut (`your-service-account@your-project.iam.gserviceaccount.com`) sebagai pengguna dengan izin **Administrator** atau **Edit** di tingkat Container/Account GTM yang bersangkutan.

## Struktur Endpoint Utama (GTM API v2)

API GTM menggunakan hirarki berikut:
- **Accounts**: `accounts/{accountId}`
- **Containers**: `accounts/{accountId}/containers/{containerId}`
- **Workspaces**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}`
- **Variables**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/variables`
- **Triggers**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/triggers`
- **Tags**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/tags`

---

## Panduan Penggunaan Skrip Node.js (googleapis)

Berikut adalah struktur kode dasar untuk menginisialisasi Google API Client dan melakukan operasi CRUD pada workspace GTM:

### 1. Inisialisasi Kredensial & GTM Client
```javascript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json', // Path ke file JSON Service Account Anda
  scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers'],
});

const tagmanager = google.tagmanager({
  version: 'v2',
  auth,
});
```

### 2. Membuat Variabel Kustom (Custom Variable)
Variabel digunakan untuk mengambil nilai dari `dataLayer` (misalnya mengambil `ref_code` atau `cta_location`).
```javascript
async function createDataLayerVariable(parent, variableName, dataLayerKey) {
  const response = await tagmanager.accounts.containers.workspaces.variables.create({
    parent, // Format: accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}
    requestBody: {
      name: variableName,
      type: 'v', // 'v' singkatan dari Data Layer Variable
      parameter: [
        { type: 'template', key: 'name', value: dataLayerKey },
        { type: 'template', key: 'defaultValue', value: '' },
        { type: 'template', key: 'dataLayerVersion', value: '2' }
      ]
    }
  });
  console.log(`Variabel ${variableName} berhasil dibuat!`);
  return response.data;
}
```

### 3. Membuat Pemicu Kustom (Custom Trigger)
Pemicu mendengarkan event yang dikirimkan melalui `dataLayer.push` (misalnya event `purchase_initiated`).
```javascript
async function createCustomEventTrigger(parent, triggerName, eventName) {
  const response = await tagmanager.accounts.containers.workspaces.triggers.create({
    parent,
    requestBody: {
      name: triggerName,
      type: 'customEvent',
      customEventFilter: [
        {
          type: 'equals',
          parameter: [
            { type: 'template', key: 'arg0', value: '_event' },
            { type: 'template', key: 'arg1', value: eventName }
          ]
        }
      ]
    }
  });
  console.log(`Trigger ${triggerName} untuk event "${eventName}" berhasil dibuat!`);
  return response.data;
}
```

### 4. Membuat Tag Pelacakan (Custom HTML atau GA4 Event)
Menghubungkan Trigger dengan Tag tujuan (misalnya mengirim data ke Meta Pixel atau GA4).
```javascript
async function createCustomHtmlTag(parent, tagName, htmlCode, triggerIds) {
  const response = await tagmanager.accounts.containers.workspaces.tags.create({
    parent,
    requestBody: {
      name: tagName,
      type: 'html',
      parameter: [
        { type: 'template', key: 'html', value: htmlCode }
      ],
      firingTriggerId: triggerIds // Array dari triggerId
    }
  });
  console.log(`Tag HTML ${tagName} berhasil dibuat!`);
  return response.data;
}
```

### 5. Mempublikasikan Perubahan (Publish Workspace / Create Version)
Setelah selesai membuat konfigurasi, Anda harus mempublikasikannya agar aktif di website.
```javascript
async function publishWorkspace(workspacePath, versionName) {
  const response = await tagmanager.accounts.containers.workspaces.create_version({
    path: workspacePath,
    requestBody: {
      name: versionName,
      notes: 'Otomatis dibuat oleh script GTM API Management Siklusio'
    }
  });
  console.log(`Workspace berhasil dikompilasi menjadi Versi: ${response.data.containerVersion.name}`);
  return response.data;
}
```

---

## Best Practices & Tips Kesalahan Umum
1. **Rate Limiting**: API Google memiliki batas kuota. Jika membuat banyak tag/trigger sekaligus, beri jeda waktu (delay) sekitar 500ms - 1s antar request untuk mencegah error `429 Too Many Requests`.
2. **Double Check Triggers**: Jika Anda membuat trigger kustom, pastikan parameter `arg0` bernilai `_event` (bukan nama variabel kustom) karena GTM mencocokkan event name dataLayer pada filter internal `_event`.
3. **Workspace Locking**: Jika ada orang lain yang sedang mengedit workspace yang sama secara manual, API request Anda bisa ditolak atau konflik. Selalu buat workspace terpisah khusus untuk API sebelum di-merge.

---

## 📦 Panduan Format Impor GTM Web UI (JSON Recipe) & Gotchas Penting

Jika Anda membuat file JSON GTM secara manual untuk diimpor langsung melalui halaman web **Admin > Import Container**, aturan validasinya **JAUH LEBIH KETAT** dan **sensitif terhadap huruf besar/kecil (case-sensitive)** dibandingkan REST API:

### 1. Struktur Folder Wajib (Singular & Terbungkus)
File JSON wajib menggunakan struktur root `"containerVersion"`, tetapi di dalamnya **wajib menggunakan nama singular** (tanpa akhiran 's'):
* **Benar**: `"variable"`, `"trigger"`, `"tag"`.
* **Salah**: `"variables"`, `"triggers"`, `"tags"`.

### 2. Penamaan ID Unik Wajib
Setiap item wajib memiliki ID numerik unik agar sistem GTM dapat mengindeksnya:
* Contoh: `"variableId": "101"`, `"triggerId": "201"`, `"tagId": "301"`.

### 3. Casing Nilai Enum Harus Huruf Kapital Penuh (UPPERCASE)
Semua jenis nilai bertipe enum internal wajib ditulis dalam huruf besar (kapital):
* **Parameter Type**: Wajib `"type": "TEMPLATE"` atau `"type": "INTEGER"`. *(Lowercase `"template"` akan menyebabkan error deserializing)*.
* **Trigger Type**: Wajib `"type": "CUSTOM_EVENT"`. *(Camelcase `"customEvent"` akan ditolak)*.
* **Filter Condition Type**: Wajib `"type": "EQUALS"`. *(Lowercase `"equals"` akan memicu error deserializing)*.

### 4. Penulisan Variabel di Filter Harus Menggunakan Kurung Kurawal Ganda `{{...}}`
Saat mendefinisikan filter pemicu kustom (`customEventFilter`), argumen pertama (`arg0`) wajib dirujuk sebagai variabel menggunakan sintaks GTM resmi:
* **Benar**: `"value": "{{_event}}"`
* **Salah**: `"value": "_event"` *(Akan memicu error: "Filter's first argument must be variable")*

### 5. Penghubung Tag GA4 Event (`gaawe`) ke Google Tag Config
Di dalam GTM JSON, Tag GA4 Event (`gaawe`) membutuhkan parameter `"measurementId"` untuk menghubungkannya ke Tag GA4 Utama. Parameter ini **tidak boleh diisi string kode G-XXXXXX secara langsung**, melainkan harus bertipe `"TAG_REFERENCE"` yang merujuk pada nama Google Tag Anda:
* **Benar**: 
  ```json
  {
    "type": "TAG_REFERENCE",
    "key": "measurementId",
    "value": "Google Tag - GA4 Config"
  }
  ```
* **Salah**:
  ```json
  {
    "type": "TEMPLATE",
    "key": "measurementId",
    "value": "G-P5WBKJ8BQC"
  }
  ```
  *(Pengisian string G-XXXXXX langsung pada event parameter ini akan memicu error validasi merah "Not Found." karena engine GTM mencoba mencari tag bernama G-XXXXXX di database kontainer).*
