# Sprint 3 Mobile QA Sign-off — Siklusio

**Tanggal QA:**
**Tester:**
**Device/Web:**
**Branch/Commit:** `main / 5b8c3fb`
**Build/Environment:** local / preview / production
**Status akhir:** PASS / PARTIAL / FAIL

---

## 1. Dashboard

| Item                            | Expected                                  | Result      | Notes |
| ------------------------------- | ----------------------------------------- | ----------- | ----- |
| Dashboard terbuka setelah login | Halaman tampil tanpa crash                | PASS / FAIL |       |
| Fase siklus tampil              | Fase, hari siklus, prediksi muncul normal | PASS / FAIL |       |
| Action card tampil              | CTA sesuai fase/kondisi                   | PASS / FAIL |       |
| Tabungan promil tampil          | Target/current saving muncul              | PASS / FAIL |       |
| Avatar/profile button tampil    | Avatar/nama tampil normal                 | PASS / FAIL |       |
| TWW modal bisa dibuka           | Modal tampil dan tidak crash              | PASS / FAIL |       |

---

## 2. Calendar

| Item                           | Expected                                | Result      | Notes |
| ------------------------------ | --------------------------------------- | ----------- | ----- |
| Kalender terbuka               | Grid tanggal tampil normal              | PASS / FAIL |       |
| Toggle menstruasi/log activity | Perubahan tersimpan dan UI update       | PASS / FAIL |       |
| Prediksi/fertile window tampil | Highlight tetap benar                   | PASS / FAIL |       |
| AI report modal terbuka        | Modal tampil dan request/cache berjalan | PASS / FAIL |       |

---

## 3. Habits

| Item                                  | Expected                       | Result      | Notes |
| ------------------------------------- | ------------------------------ | ----------- | ----- |
| Habits terbuka                        | Tidak crash/loading stuck      | PASS / FAIL |       |
| Checklist habit bisa dicentang        | Progress berubah dan tersimpan | PASS / FAIL |       |
| Symptom tracking berjalan             | Gejala bisa dipilih/dihapus    | PASS / FAIL |       |
| AI habits insight berjalan            | Hasil tampil atau cache tampil | PASS / FAIL |       |
| Data tetap ada setelah refresh/reopen | State tidak hilang             | PASS / FAIL |       |

---

## 4. Settings

| Item                      | Expected                                           | Result      | Notes |
| ------------------------- | -------------------------------------------------- | ----------- | ----- |
| Settings terbuka          | Tab Profil dan Siklus & Tabungan tampil            | PASS / FAIL |       |
| Ubah nama/profil          | Data tersimpan dan dashboard ikut update           | PASS / FAIL |       |
| Ubah HPHT                 | Date picker tampil dan nilai berubah               | PASS / FAIL |       |
| Override warning muncul   | Konfirmasi muncul saat mengubah data siklus kritis | PASS / FAIL |       |
| Ubah panjang siklus/haid  | Nilai tersimpan, prediksi update                   | PASS / FAIL |       |
| Tabungan promil tersimpan | Target/current saving tersimpan                    | PASS / FAIL |       |
| Pengingat native-only     | Tidak muncul di web, tetap aman di native          | PASS / FAIL |       |
| Referral card             | Tombol menuju `/affiliate` berjalan                | PASS / FAIL |       |
| Logout                    | Konfirmasi muncul dan logout sukses                | PASS / FAIL |       |

---

## 5. Community

| Item                | Expected                                  | Result      | Notes |
| ------------------- | ----------------------------------------- | ----------- | ----- |
| Feed load awal      | Post tampil normal                        | PASS / FAIL |       |
| Pull-to-refresh     | Feed refresh tanpa crash                  | PASS / FAIL |       |
| Load more           | Pagination jalan via FlatList             | PASS / FAIL |       |
| Empty state         | Tampil benar jika tidak ada post          | PASS / FAIL |       |
| Buat post           | Composer modal dan submit berjalan        | PASS / FAIL |       |
| Reaction            | Toggle reaction optimistic tetap benar    | PASS / FAIL |       |
| Comments            | Modal komentar tampil dan submit berjalan | PASS / FAIL |       |
| Report post/comment | Report modal dan submit berjalan          | PASS / FAIL |       |
| Hapus post sendiri  | Konfirmasi dan delete berjalan            | PASS / FAIL |       |
| Anonymous display   | Identitas tetap disembunyikan sesuai flag | PASS / FAIL |       |

---

## 6. Admin — Users, Coupons, Moderation

| Item                           | Expected                               | Result      | Notes |
| ------------------------------ | -------------------------------------- | ----------- | ----- |
| Admin page terbuka untuk admin | Shell dan tabs tampil                  | PASS / FAIL |       |
| Non-admin ditolak              | Tidak bisa akses admin                 | PASS / FAIL |       |
| Users list                     | Data user tampil, search/expand jalan  | PASS / FAIL |       |
| CSV export web-only            | Export berjalan di web, aman di native | PASS / FAIL |       |
| Coupons list                   | Kupon tampil                           | PASS / FAIL |       |
| Create/toggle/delete coupon    | CRUD berjalan normal                   | PASS / FAIL |       |
| Moderation queue               | Pending/reviewed/all filter tampil     | PASS / FAIL |       |
| Keep/remove/reset avatar       | Aksi moderasi berjalan                 | PASS / FAIL |       |

---

## 7. Admin CRM

| Item                       | Expected                                  | Result      | Notes |
| -------------------------- | ----------------------------------------- | ----------- | ----- |
| CRM summary/stat cards     | Data tampil normal                        | PASS / FAIL |       |
| List view                  | Tabel/card tampil normal                  | PASS / FAIL |       |
| Kanban view                | Board per payment status tampil           | PASS / FAIL |       |
| Detail view                | Detail lead tampil                        | PASS / FAIL |       |
| Search debounce            | Search jalan dan reset offset             | PASS / FAIL |       |
| Filter payment/lead status | Filter dan clear filter berjalan          | PASS / FAIL |       |
| Pagination                 | Prev/next berjalan                        | PASS / FAIL |       |
| Quick payment status       | Dropdown jalan dan rollback jika error    | PASS / FAIL |       |
| Lead status                | Dropdown jalan dan rollback jika error    | PASS / FAIL |       |
| Mark contacted             | Status kontak update                      | PASS / FAIL |       |
| Manual payment override    | Form dan activation checkbox berjalan     | PASS / FAIL |       |
| Notes                      | Tambah/timeline notes berjalan            | PASS / FAIL |       |
| Copy WA follow-up          | Template tersalin/terbuka sesuai platform | PASS / FAIL |       |

---

## 8. Admin Affiliate

| Item             | Expected                             | Result      | Notes |
| ---------------- | ------------------------------------ | ----------- | ----- |
| Stats affiliate  | Revenue/pending/paid tampil          | PASS / FAIL |       |
| List affiliate   | Data tampil dan expand bank jalan    | PASS / FAIL |       |
| Create affiliate | Validasi dan submit berjalan         | PASS / FAIL |       |
| Toggle active    | Status aktif berubah                 | PASS / FAIL |       |
| Delete affiliate | Konfirmasi dan delete berjalan       | PASS / FAIL |       |
| Conversion list  | Riwayat konversi tampil              | PASS / FAIL |       |
| Mark payout paid | Prompt referensi dan update berjalan | PASS / FAIL |       |

---

## 9. Admin WhatsApp Autoresponder

| Item                  | Expected                                     | Result      | Notes |
| --------------------- | -------------------------------------------- | ----------- | ----- |
| Settings list         | Event registration/payment tampil            | PASS / FAIL |       |
| Enable/disable toggle | Toggle berjalan                              | PASS / FAIL |       |
| Delay seconds         | Validasi 0–86400 tetap jalan                 | PASS / FAIL |       |
| Template editor       | Edit dan reset template berjalan             | PASS / FAIL |       |
| Placeholder chips     | Insert di cursor berjalan                    | PASS / FAIL |       |
| Preview debounce      | Preview update setelah delay                 | PASS / FAIL |       |
| Test send             | Kirim test WA berjalan atau error controlled | PASS / FAIL |       |
| Logs filter           | Filter event/status berjalan                 | PASS / FAIL |       |
| Expand metadata       | Detail log bisa dibuka                       | PASS / FAIL |       |

---

## 10. Regression Spot-check

| Item                            | Expected                       | Result      | Notes |
| ------------------------------- | ------------------------------ | ----------- | ----- |
| App web tidak crash             | Semua tab utama bisa dibuka    | PASS / FAIL |       |
| Native/Expo tidak crash         | Semua tab utama bisa dibuka    | PASS / FAIL |       |
| Tidak ada warning fatal console | Tidak ada error runtime kritis | PASS / FAIL |       |
| Auth session tetap persist      | Reopen app tetap login         | PASS / FAIL |       |
| Offline/local state tidak rusak | Data lokal tetap aman          | PASS / FAIL |       |

---

## Bugs Found

| ID     | Area | Severity                       | Description | Screenshot/Log | Status                  |
| ------ | ---- | ------------------------------ | ----------- | -------------- | ----------------------- |
| QA-001 |      | Low / Medium / High / Critical |             |                | Open / Fixed / Deferred |

---

## Final Sign-off

**QA Result:** PASS / PARTIAL / FAIL

**Catatan akhir:**

**Keputusan:**

- [ ] Sprint 3 accepted, lanjut Sprint 4B
- [ ] Perlu bugfix kecil sebelum Sprint 4B
- [ ] Perlu rollback/patch besar