# PRD: Siklusio

Status: Draft v1  
Last updated: 2026-05-28  
Product area: Menstrual cycle tracking, promil support, AI insight, community  
Primary market: Indonesia  

## 0. Working Assumptions

- PRD ini mendokumentasikan Siklusio versi produk yang sedang dibangun, bukan spek aplikasi baru dari nol.
- Scope utama adalah MVP promil: cycle tracking, masa subur, habit logging, AI insight, pesan suami, TWW support, komunitas anonim, dan admin moderation.
- Target awal adalah perempuan Indonesia yang sedang promil dan membutuhkan pendampingan yang privat, hangat, dan praktis.
- Model monetisasi awal mengikuti landing page saat ini: akses premium satu kali bayar tanpa iklan pihak ketiga.
- Semua klaim kesehatan harus diposisikan sebagai edukasi dan pendampingan umum, bukan diagnosis atau janji hasil.

## 1. Product Summary

Siklusio adalah aplikasi pendamping siklus menstruasi dan program hamil untuk perempuan Indonesia. Produk ini membantu pengguna memahami fase tubuhnya, memprediksi masa subur, menjalankan kebiasaan promil harian, mengajak suami ikut berikhtiar tanpa canggung, dan mendapatkan dukungan emosional melalui AI serta komunitas anonim.

Positioning utama:

> Promil lebih terarah, suami lebih paham, hati lebih tenang.

Siklusio tidak diposisikan sebagai alat diagnosis medis atau pengganti dokter. Siklusio adalah pendamping personal berbasis data siklus, kebiasaan, dan dukungan emosional yang membantu pengguna mengambil langkah kecil yang lebih jelas setiap hari.

## 2. Problem Statement

Banyak perempuan yang sedang promil menghadapi masalah yang bukan hanya teknis, tetapi juga emosional dan sosial:

- Bingung menghitung masa subur, terutama jika siklus tidak terasa "normal" 28 hari.
- Takut melewatkan momentum ovulasi karena hanya mengandalkan ingatan atau kalender umum.
- Sulit konsisten menjalankan kebiasaan promil harian seperti asam folat, hidrasi, istirahat, nutrisi, dan aktivitas ringan.
- Canggung mengajak suami berhubungan di masa subur karena terasa seperti tugas, bukan momen bersama.
- Cemas saat fase TWW dan takut melihat testpack negatif lagi.
- Tertekan oleh pertanyaan "kapan punya anak?" dari keluarga atau lingkungan.
- Butuh ruang aman untuk cerita tanpa takut dihakimi.
- Khawatir data sensitif tentang tubuh, siklus, dan promil dimanfaatkan untuk iklan atau terekspos.

## 3. Product Thesis

Jika Siklusio mampu menggabungkan prediksi siklus yang jelas, aksi harian yang sederhana, komunikasi pasangan yang lebih lembut, dan ruang emosional yang aman, maka pengguna akan merasa lebih tenang, lebih konsisten, dan lebih percaya untuk kembali menggunakan aplikasi setiap hari sepanjang perjalanan promil.

Keunggulan utama Siklusio bukan hanya "tracking", tetapi pendampingan per fase:

- Apa yang sedang terjadi di tubuh pengguna.
- Apa yang sebaiknya dilakukan hari ini.
- Bagaimana mengajak suami ikut paham.
- Di mana pengguna bisa menumpahkan rasa cemas tanpa dihakimi.

## 4. Goals

### Business Goals

- Membuat Siklusio menjadi aplikasi promil lokal yang dipercaya oleh perempuan Indonesia.
- Meningkatkan aktivasi pengguna baru sampai selesai onboarding.
- Meningkatkan retensi harian melalui checklist, kalender, insight, dan komunitas.
- Membangun diferensiasi kuat dibanding aplikasi period tracker generik.
- Mendukung model monetisasi premium satu kali bayar tanpa iklan pihak ketiga.

### User Goals

- Mengetahui fase siklus, masa subur, dan prediksi haid berikutnya secara mudah.
- Mendapat arahan harian yang relevan dengan fase siklus.
- Mencatat kebiasaan dan gejala tanpa ribet.
- Mendapat insight personal dari pola 7 hari terakhir.
- Mengajak suami lebih peka dan terlibat dalam promil.
- Merasa didengar saat fase TWW, haid datang lagi, atau testpack negatif.
- Bisa berbagi cerita secara anonim dan aman.

### Product Goals

- Satu alur utama dari onboarding ke dashboard harus terasa personal dalam sesi pertama.
- Pengguna harus bisa memahami status siklus hari ini dalam waktu kurang dari 5 detik di dashboard.
- Pengguna harus bisa menyelesaikan log harian dalam waktu kurang dari 60 detik.
- Pengguna harus bisa membuka template pesan suami saat masa subur dalam maksimal 2 tap dari dashboard.
- Komunitas harus aman secara teknis dan sosial melalui anonimitas, rate limit, report, dan moderasi.

## 5. Non-Goals

Siklusio tidak akan:

- Memberikan diagnosis medis, klaim kesuburan absolut, atau jaminan hamil.
- Menggantikan konsultasi dokter kandungan, dokter fertilitas, bidan, atau tenaga medis.
- Menampilkan iklan pihak ketiga berbasis data siklus atau data promil.
- Membuat komunitas bebas tanpa moderasi.
- Menjadi aplikasi kehamilan lengkap, parenting, atau marketplace produk ibu dalam scope MVP.
- Menyediakan rekomendasi obat, dosis hormon, atau tindakan klinis invasif.

## 6. Target Users

### Persona 1: Pejuang Garis Dua Baru

Perempuan menikah usia 24-34 tahun yang mulai promil dan masih bingung membaca masa subur. Ia butuh aplikasi yang lembut, mudah, dan tidak membuatnya merasa gagal.

Needs:

- Prediksi masa subur yang mudah dipahami.
- Checklist promil harian.
- Edukasi sederhana tentang fase siklus.
- Reminder agar tidak lupa momentum.

### Persona 2: Pengguna dengan Beban Emosional Promil

Perempuan yang sudah beberapa bulan atau tahun mencoba hamil dan sering kecewa saat haid datang lagi. Ia butuh validasi emosional, bukan hanya kalender.

Needs:

- Dukungan saat TWW.
- Afirmasi dan journaling.
- Komunitas anonim.
- Insight yang tidak menghakimi.

### Persona 3: Istri yang Ingin Suami Lebih Terlibat

Pengguna yang tahu promil butuh kerja sama, tetapi canggung menyampaikan masa subur atau kebutuhan emosional ke pasangan.

Needs:

- Template WhatsApp ke suami.
- Bahasa yang romantis dan tidak terasa memaksa.
- Fitur yang menjadikan promil sebagai kerja tim.

### Persona 4: Admin dan Moderator

Tim internal yang menjaga komunitas tetap aman, hangat, dan bebas penyalahgunaan.

Needs:

- Moderation queue.
- Report grouping.
- Action untuk keep, hide, reset avatar.
- Rate limiting dan privacy hardening.

## 7. Core User Journeys

### Journey A: New User Activation

1. Pengguna membuka landing page atau aplikasi.
2. Pengguna register/login.
3. Pengguna menyelesaikan onboarding: nama panggilan, tanggal lahir, jumlah anak, HPHT, panjang siklus, lama haid, data suami.
4. Aplikasi menampilkan dashboard personal dengan fase hari ini.
5. Pengguna melihat aksi utama hari ini: checklist, masa subur, pesan suami, atau TWW sanctuary.

Success criteria:

- Onboarding selesai tanpa kebingungan.
- Dashboard terasa personal.
- Pengguna memahami "hari ini aku harus apa".

### Journey B: Daily Promil Routine

1. Pengguna membuka tab Habits.
2. Pengguna melihat checklist berdasarkan fase siklus.
3. Pengguna mencentang task yang selesai.
4. Pengguna mencatat gejala.
5. Pengguna melihat progres hari ini.
6. Setelah data cukup, pengguna meminta insight AI mingguan.

Success criteria:

- Log harian selesai kurang dari 60 detik.
- Checklist terasa relevan dengan fase.
- Insight AI terasa personal dan suportif.

### Journey C: Fertile Window Action

1. Pengguna membuka dashboard atau kalender.
2. Aplikasi menandai masa subur atau ovulasi.
3. Dashboard memunculkan action untuk kirim pesan ke suami.
4. Pengguna memilih template.
5. WhatsApp terbuka dengan pesan yang sudah dipersonalisasi.

Success criteria:

- Pengguna tidak perlu merangkai pesan sendiri.
- Bahasa pesan terasa hangat, tidak kaku, dan tidak memaksa.
- Fitur terasa membantu pasangan menjadi tim promil.

### Journey D: TWW Emotional Support

1. Pengguna memasuki fase luteal/TWW.
2. Dashboard menampilkan Pojok Tenang TWW.
3. Pengguna membuka TWW Sanctuary.
4. Pengguna dapat melakukan breathing exercise, mendengar audio relaksasi, menulis jurnal, dan meminta reassurance AI.

Success criteria:

- Pengguna merasa lebih tenang setelah memakai fitur.
- AI tidak memberi klaim medis atau janji hasil.
- Pesan AI bersifat validatif, aman, dan mendorong konsultasi medis bila perlu.

### Journey E: Anonymous Community Support

1. Pengguna membuka tab Komunitas.
2. Pengguna membaca cerita pengguna lain.
3. Pengguna membuat post atau komentar dengan opsi anonim.
4. Pengguna memberi reaksi dukungan.
5. Pengguna dapat melaporkan konten bermasalah.
6. Admin dapat meninjau dan menindak laporan.

Success criteria:

- Identitas anonim terlindungi.
- Komunitas terasa hangat dan tidak toxic.
- Konten bermasalah dapat dilaporkan dan dimoderasi.

## 8. Functional Requirements

### P0 Requirements

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-001 | Auth dan profile pengguna | Pengguna dapat register/login, data profile tersimpan, dan sesi digunakan untuk akses fitur personal. |
| FR-002 | Onboarding personal | Pengguna mengisi nama panggilan, tanggal lahir, jumlah anak, HPHT, panjang siklus, lama haid, nama/panggilan/nomor suami. Data tersimpan lokal dan tersinkron ke Supabase saat sesi tersedia. |
| FR-003 | Cycle engine | Sistem menghitung hari siklus, fase menstruasi/folikular/ovulasi/luteal, masa subur, dan prediksi haid berikutnya berdasarkan HPHT, panjang siklus, panjang haid, dan log haid manual. |
| FR-004 | Dashboard personal | Dashboard menampilkan sapaan, tanggal, kartu siklus, fase hari ini, afirmasi, savings tracker, dan action card yang berubah sesuai fase serta progres harian. |
| FR-005 | Dynamic action card | Jika checklist rendah, CTA mengarah ke Habits. Jika masa subur/ovulasi, CTA membuka template suami. Jika menstruasi, CTA mengarah ke nutrisi/kebiasaan. Jika luteal, CTA membuka TWW Sanctuary. |
| FR-006 | Daily habits | Pengguna dapat melihat checklist harian sesuai fase, mencentang task, melihat persentase progres, dan membuka riwayat. |
| FR-007 | Symptom tracking | Pengguna dapat menandai gejala harian seperti kram, sakit kepala, kelelahan, dan mood swing. |
| FR-008 | Calendar tracking | Pengguna dapat melihat kalender siklus, memilih tanggal, melihat fase, menandai atau menghapus log haid manual, dan membuka AI cycle report. |
| FR-009 | AI habits insight | AI menganalisis data aktivitas dan gejala 7 hari terakhir untuk menghasilkan ringkasan, analisis gejala, tips, dan motivasi. |
| FR-010 | AI cycle report | AI memberi wawasan siklus yang dipersonalisasi berdasarkan posisi siklus dan data pengguna. |
| FR-011 | TWW Sanctuary | Pengguna fase luteal dapat membuka breathing exercise, audio relaksasi, jurnal emosi, dan calming reassurance dari AI. |
| FR-012 | Husband message templates | Sistem menyediakan template pesan WhatsApp berdasarkan fase siklus dan data panggilan suami, lalu membuka WhatsApp dengan teks terisi. |
| FR-013 | Community feed | Pengguna dapat melihat post komunitas dengan pagination, membuat post, memberi reaksi, membuka komentar, dan refresh feed. |
| FR-014 | Anonymous posting | Post dan komentar memiliki opsi anonim. Identitas asli tidak tampil di feed ketika anonim aktif, tetapi user_id tetap tersimpan untuk moderasi. |
| FR-015 | Community safety | Sistem mendukung report reason preset/custom, rate limit post/komentar, auto-hide threshold, dan moderation queue. |
| FR-016 | Admin moderation | Admin dapat melihat user, export CSV, melihat laporan, memilih pertahankan/sembunyikan konten, dan reset avatar tidak pantas. |
| FR-017 | Privacy and RLS | Semua data personal dilindungi RLS, service role hanya di backend, dan direct SELECT ke kolom sensitif komunitas dibatasi untuk user biasa. |
| FR-018 | Error handling lokal | Error API, rate limit, dan validasi input ditampilkan dengan pesan Indonesia yang jelas dan tidak menyalahkan pengguna. |

### P1 Requirements

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-101 | Savings tracker | Pengguna dapat melihat target/tabungan persiapan kehamilan dan status kontribusi. |
| FR-102 | Avatar system | Pengguna dapat memilih avatar preset atau upload custom avatar melalui backend/R2. Avatar tidak tampil saat anonim aktif. |
| FR-103 | Notification settings | Pengguna dapat mengatur notifikasi fase siklus, ovulasi, dan nutrisi. |
| FR-104 | History analytics | Pengguna dapat melihat histori 7/14/30 hari untuk kebiasaan dan gejala, dengan fallback aman jika chart gagal. |
| FR-105 | Checkout and premium access | Landing/checkout menjelaskan value premium, pembayaran satu kali, dan akses setelah registrasi. |
| FR-106 | Content safety for AI | Prompt dan response AI harus menghindari diagnosis, janji hamil, dosis obat, atau instruksi klinis berisiko. |

### P2 Requirements

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-201 | Partner mode | Suami dapat menerima ringkasan fase dan reminder lembut tanpa melihat data sensitif penuh. |
| FR-202 | OPK/BBT tracking | Pengguna dapat mencatat hasil ovulation test atau suhu basal untuk meningkatkan akurasi fertile window. |
| FR-203 | Expert content library | Artikel edukasi promil terkurasi dari dokter/ahli dengan disclaimer medis. |
| FR-204 | Doctor consultation handoff | Pengguna mendapat panduan kapan perlu konsultasi dokter, tanpa menggantikan diagnosis. |

## 9. UX and Content Requirements

Tone Siklusio harus:

- Hangat, personal, dan validatif.
- Menggunakan bahasa Indonesia yang natural.
- Menghindari rasa menggurui atau menyalahkan.
- Mengakui bahwa promil bisa melelahkan secara emosional.
- Mengajak suami sebagai partner, bukan target komplain.
- Menghindari klaim "pasti hamil", "100% akurat", atau "dokter virtual".

Preferred copy pattern:

- Jelaskan fase tubuh pengguna.
- Validasi perasaan pengguna.
- Beri 1 sampai 3 aksi kecil yang bisa dilakukan hari ini.
- Beri CTA yang spesifik: catat gejala, selesaikan checklist, kirim pesan suami, atau tenangkan diri.

Medical disclaimer pattern:

> Informasi ini bersifat edukatif dan pendampingan umum, bukan diagnosis medis. Jika kamu mengalami nyeri berat, perdarahan tidak wajar, siklus sangat tidak teratur, atau sudah lama promil tanpa hasil, konsultasikan dengan tenaga medis.

## 10. Data Requirements

### Core Data

- User profile: nickname, birth date, children count, onboarding status.
- Cycle settings: last period date, cycle length, period length.
- Husband info: name, nickname, WhatsApp number.
- Activity history: date, tasks, completion state, symptoms, isPeriod marker.
- Savings data: target and progress.

### Community Data

- Posts: content, author, anonymous state, counters, moderation state.
- Comments: post reference, content, author, anonymous state.
- Reactions: fixed reaction types and user ownership.
- Reports: target type, target id, reason, reporter, status.
- Avatar: preset or custom URL, reset state when moderated.

### AI Input Data

- Current phase.
- Last 7 days of tasks and symptoms.
- Optional journal text for TWW calming reassurance.
- User nickname only when needed for personalization.

AI should not receive unnecessary sensitive data. Husband phone number should not be sent to AI.

## 11. Privacy, Safety, and Compliance Requirements

- Use Supabase RLS for all user-owned data.
- Keep service role key only in backend.
- Store anonymous community user_id for moderation but never expose it in feed responses.
- Enforce post/comment rate limits at database level and surface clear client messages.
- Auto-hide content after report threshold, while still allowing admin review.
- Admin endpoints must verify Bearer token and admin role server-side.
- Avoid ad-tech integrations that rely on cycle, fertility, or promil data.
- AI features must include guardrails against medical diagnosis, pregnancy guarantees, and unsafe advice.

## 12. Success Metrics

### Activation

- Registration to onboarding completion rate.
- Onboarding step drop-off rate.
- First dashboard viewed rate.
- First checklist completed rate.

### Engagement

- Daily active users.
- Habit checklist completion rate.
- Symptom logging frequency.
- Calendar opens per user per cycle.
- AI insight requests per active user.
- TWW Sanctuary opens during luteal phase.

### Partner Involvement

- Husband message modal opens.
- WhatsApp send intent clicks.
- Repeat usage of message templates across cycles.

### Community Health

- Posts per active community user.
- Comments per post.
- Supportive reaction rate.
- Report rate.
- Moderation resolution time.
- Percentage of auto-hidden content reviewed by admin.

### Retention and Monetization

- D1, D7, D30 retention.
- Paid conversion rate from landing/checkout.
- Refund/support complaint rate.
- Churn reasons from qualitative feedback.

## 13. Release Scope

### MVP Release

MVP is considered complete when users can:

- Register/login.
- Complete onboarding.
- See personalized dashboard.
- Track cycle and fertile window.
- Log daily habits and symptoms.
- View calendar and mark period manually.
- Request AI insight/report.
- Use husband WhatsApp templates.
- Use TWW Sanctuary.
- Post/comment/react/report in anonymous community.
- Be protected by admin moderation and privacy controls.

### Post-MVP

- Push notifications.
- Partner mode.
- OPK/BBT tracking.
- Expert education content.
- More advanced health analytics.
- Doctor consultation handoff.

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Users interpret AI as medical diagnosis | High | Add AI prompt guardrails, disclaimer, and unsafe-advice filters. |
| Fertility prediction feels inaccurate for irregular cycles | High | Be transparent that prediction is estimate, allow manual period logs, consider OPK/BBT post-MVP. |
| Community anonymity abused | High | Keep user_id for moderation, enforce rate limits, reports, admin actions, and auto-hide threshold. |
| Sensitive data privacy concerns | High | Avoid third-party ads, minimize AI input data, enforce RLS and column-level restrictions. |
| Tone feels too emotional or too medical | Medium | Maintain warm but grounded copy; avoid exaggerated claims. |
| Husband message feature feels awkward | Medium | Provide multiple tone options later: romantic, gentle, direct, playful. |
| Premium one-time model underfunds AI costs | Medium | Track AI usage cost per user and consider fair usage limits. |

## 15. Open Questions

- Apakah Siklusio akan tetap fokus hanya pada promil, atau nanti melebar ke pregnancy tracking setelah pengguna hamil?
- Apakah premium access benar-benar lifetime satu kali bayar, atau perlu batasan biaya AI agar sustainable?
- Apakah komunitas perlu topik/tag khusus seperti TWW, PCOS, haid datang lagi, ovulasi, nutrisi, dan doa?
- Apakah perlu mode bahasa yang lebih netral selain sapaan "Bunda" untuk pengguna yang belum nyaman dengan istilah itu?
- Apakah template pesan suami perlu pilihan tone sejak MVP?
- Apakah AI report perlu disimpan sebagai histori, atau cukup muncul per request?
- Apakah data suami wajib di onboarding, atau sebaiknya bisa dilewati agar aktivasi lebih ringan?

## 16. Launch Messaging

Primary USP:

> Aplikasi promil privat yang membantu kamu memahami siklus, menemukan masa subur, mengajak suami lebih paham, dan merasa tidak sendirian.

Short tagline:

> Promil lebih terarah, suami lebih paham, hati lebih tenang.

Instagram bio:

> Teman promil privat untuk pejuang garis dua. Lacak masa subur, catat kebiasaan, kirim pesan ke suami, dan cerita anonim tanpa dihakimi.

Landing hero direction:

> Untuk perempuan yang capek menebak masa subur sendirian. Siklusio membantumu membaca fase tubuh, memilih langkah hari ini, mengajak suami ikut paham, dan tetap tenang di perjalanan promil.

## 17. Acceptance Criteria for This PRD

This PRD is ready to guide implementation and growth work if:

- Product positioning is clear and differentiated.
- MVP scope is explicit.
- P0/P1/P2 requirements are separated.
- Safety and medical boundaries are documented.
- Privacy and community moderation requirements are included.
- Success metrics are measurable.
- Open questions are listed for product decisions.
