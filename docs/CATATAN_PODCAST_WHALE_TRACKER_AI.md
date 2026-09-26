# Bedah Strategi Whale Tracker Hyperliquid, Agentic Trading & Arsitektur AI Andreas Tobing

Catatan terstruktur hasil analisis mendalam podcast Andreas Tobing di Ajaib Cuan Talks.

---

## 1. Filosofi Inti: AI sebagai Leverage, Bukan Solusi Ajaib
* **Rumus Leverage Finansial:** `0 * 100 = 0`.
  * Jika seorang trader belum memiliki profitabilitas, keahlian membaca pasar, atau manajemen risiko, penggunaan AI hanya akan mempercepat kerugian (mempercepat proses bangkrut / rungkat).
  * AI melipatgandakan output dari kemampuan yang sudah ada. Jika keahlian dasar bernilai 0, pengali 100x tetap bernilai 0.
* **Arsitektur Multi-Agent (46 Agen Mandiri):**
  * Memecah setiap proyek menjadi serangkaian *microtasks* independen.
  * Prinsip: **Satu agen untuk satu tugas spesifik**, bukan satu agen monolitik untuk semua kebutuhan (seperti mempekerjakan tim spesialis: riset, naskah konten, unggah media, penyaring berita).

---

## 2. Studi Kasus: Hyperliquid Whale Tracker ($10M+ Tracker)
Sistem yang dibangun khusus untuk trader nomor satu Hyperliquid (Bisugo) dengan nama proyek `bisyugoscan.com` (diselesaikan dalam 2 hari menggunakan Claude / vibe coding).

### A. Spesifikasi & Output Sistem
* **Tujuan Utama:** Melacak setiap posisi baru (Long maupun Short) dengan nominal di atas $10.000.000 USD pada platform Hyperliquid.
* **Cakupan Data:** Memantau 44 smart wallet terpilih dengan total modal terpantau mencapai $1,84 Miliar USD.
* **Bentuk Output:** Dashboard real-time (rasio sentimen agregat % Long vs % Short, daftar posisi aktif, PnL berjalan, aset yang dipegang) serta bot alert Telegram privat.

### B. Arsitektur 2 Mesin Terpisah
Dua mesin dirancang terpisah agar tidak saling membebani atau merusak sistem:
1. **Search Engine (Discovery Engine):**
   * Berjalan periodik (misal setiap 5 menit) menyisir puluhan ribu wallet di Hyperliquid.
   * Menemukan kandidat address baru yang mengeksekusi volume besar.
   * **Human-in-the-Loop Filter:** Tidak langsung otomatis dimasukkan ke radar utama. Sistem memberikan opsi kurasi:
     * `[Add]`: Dimasukkan ke daftar pantau aktif (watchlist).
     * `[Ignore / Reject]`: Dieliminasi dari radar.
2. **Alert Engine (Real-Time Notification):**
   * Berfokus hanya pada daftar address yang sudah terverifikasi (44 wallet).
   * Memantau perubahan posisi secara instan dan mengirim alert Telegram seketika saat order dieksekusi.

### C. Metrik Skoring Kualifikasi Smart Wallet
Tidak semua wallet besar layak dicopy. Terdapat sistem skoring tersendiri:
* **Win Rate:** Rasio posisi menang dibanding total posisi tertutup dalam kurun waktu evaluasi.
* **EV (Expected Value):** Nilai ekspektasi keuntungan matematis per transaksi.
* **Conviction Score (Skala 1 sampai 10):**
  * Dihitung berdasarkan anomali ukuran posisi dibanding riwayat transaksi 90 hari terakhir.
  * *Contoh:* Jika rata-rata posisi sebuah wallet dalam 90 hari adalah $5 Juta USD, lalu tiba-tiba membuka posisi sebesar $30 Juta USD (6x lipat), sistem memberikan Conviction Score maksimal `10/10`.
* **Disiplin Entry & Harga Rata-Rata:** Memastikan entry tidak berada di titik jenuh (pucuk) setelah momentum lewat.

---

## 3. Komparasi Medan Pelacakan: Meme Coin (Trenching) vs Perpetual DEX (Hyperliquid)

| Parameter | Trenching / Meme Coin (Solana, BSC, Base) | Perpetual DEX (Hyperliquid, Polymarket) |
| :--- | :--- | :--- |
| **Karakteristik Wallet** | Sering berganti address (disposable / sekali pakai). | Address stabil dengan rekam jejak minimal 90 hari. |
| **Praktek Cuci Dana** | Sangat ekstrem: deposit CEX, mixer, pecah saldo ke puluhan wallet baru. | Rata-rata tidak mencuci saldo (kecuali insider). |
| **Efektivitas AI** | Rendah: terlalu banyak variabel non-biner, butuh intuisi manusia & ronda malam. | Sangat tinggi: pool data terukur, metrik on-chain konsisten. |
| **Edge Utama** | Kecepatan reaksi saat token diluncurkan (jam 20:00 s.d. 05:00 WIB). | Analisis agregat sentimen institusional dan smart money flow. |

* **Penyebab AI Gagal Melacak Whale Meme Coin yang Mencuci Dana:**
  * Setelah menang besar (jackpot), dana disetor ke CEX, masuk ke kluster internal bursa, lalu ditarik ke fresh wallet dengan nominal terpecah (misal $10.000 ditarik menjadi 20 wallet masing-masing $500).
  * Buku besar internal CEX memutus keterkaitan data on-chain (*chain of custody*), sehingga model AI tidak memiliki dasar matematis pasti untuk melacak sambungannya.

---

## 4. Realita AI Trading & Evolusi ke "Agentic Order Book Trading"

### A. Batasan Model AI
* Model AI tercanggih sekalipun **tidak mampu memprediksi masa depan pasar secara pasti**.
* Keunggulan AI terletak pada:
  * Pemetaan probabilitas berbasis data historis dan jalur skenario terstruktur.
  * Pemadatan informasi: merangkum sentimen pasar, narasi makro, dan berita penting dalam 5 menit.

### B. Candlestick Trading vs Agentic Order Book Trading
* **Candlestick Trading (Level Ritel):**
  * Bertarung menebak arah warna candle berikutnya (merah atau hijau) dan mengikuti tren.
  * Rentan terhadap jebakan manipulasi spread dan gejolak emosi.
* **Agentic Trading (Level Market Maker / Kuantitatif):**
  * Medan pertarungan bergeser dari chart grafik ke level **Order Book (Level 2 / DOM)**.
  * Bertarung memperebutkan spread tipis dengan kecepatan milidetik (*sub-second execution*) yang mustahil dilakukan manusia secara manual.
  * Hanya dapat dieksekusi oleh mereka yang menguasai analisis kuantitatif sekaligus arsitektur kode tingkat lanjut.

---

## 5. Jebakan Emosi & Pendekatan "Inverse Tracking"
* **Setup Sama, Hasil Berbeda:** Musuh utama trader adalah emosi diri sendiri, bukan ketiadaan setup teknikal.
  * Pola umum: take profit terlalu cepat karena ragu, lalu FOMO masuk kembali di pucuk dengan modal lebih besar (round-trip).
  * Beban psikologis meningkat drastis seiring membesarnya ukuran posisi (*position size*).
* **Fenomena Bias pada Smart Money:**
  * Trader berpengalaman pun bisa mengalami fase emosi atau losing streak berkepanjangan.
  * Melakukan strategi "Inverse" (mengambil posisi berlawanan) terhadap trader yang sedang mengalami penurunan performa sering kali terbukti lebih menguntungkan dibanding mengikuti tanpa telaah.

---

## 6. Tiga Permainan Finansial (Urutan Mutlak)
Urutan perjalanan keuangan yang tidak boleh dilompati:
1. **Game 1: Menghasilkan Uang (Make Money)**
   * Memperbesar daya hasil (*earning power*) melalui kerja, bisnis, atau keahlian spesifik.
2. **Game 2: Mempertahankan Uang (Keep Money)**
   * Menahan diri dari pembengkakan gaya hidup (*lifestyle creep*) dan jebakan cicilan/utang.
   * Mampu membiarkan keuntungan besar mengendap tanpa tergoda membelanjakannya secara impulsif.
3. **Game 3: Melipatgandakan Uang (Multiply Money)**
   * Melakukan investasi dan alokasi risiko terukur di pasar modal atau kripto.
   * Kesalahan fatal pemula: langsung melompat ke Game 3 tanpa menguasai Game 1 dan Game 2.

---

## 7. Relevansi Teknis untuk Pengembangan Terminal FinPulse
1. **Pemisahan Thread Mesin Pemindai vs Mesin Notifikasi:**
   * Menjaga performa UI tetap responsif 60fps dengan menjalankan kalkulasi kuantitatif di background.
2. **Integrasi Metrik Conviction Volume:**
   * Membandingkan volume orderflow saat ini terhadap rata-rata historis (telah diterapkan pada radar volume dan orderflow v1.0.8).
3. **Sentimen Agregat Smart Money:**
   * Menampilkan rasio dominasi posisi pembeli agresif vs penjual agresif secara real-time dari feed transaksi bursa asli.
