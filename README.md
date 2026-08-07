# Akun Google Switcher

Sebuah ekstensi Google Chrome yang memungkinkan Anda untuk dengan mudah mengatur dan berpindah antar akun Google Workspace untuk berbagai layanan Google (Drive, Docs, Mail, Meet, Classroom, Gemini) langsung dari satu antarmuka pop-up.

## Fitur Utama

- Pemilihan Akun Independen: Tetapkan indeks akun Google tertentu (misal: Akun 0, Akun 1) untuk masing-masing layanan Google secara terpisah.
- Pengalihan Otomatis (Auto-Redirect): Secara otomatis mengalihkan Anda ke akun yang telah dipilih saat membuka tautan layanan Google yang didukung.
- Dukungan Multi-Layanan: Mendukung Google Drive, Google Docs, Google Mail, Google Meet, Google Classroom, dan Google Gemini.
- Tema Dinamis: Tersedia pilihan tema Terang, Gelap, dan Sistem (Default) untuk kenyamanan mata.
- Sinkronisasi Akun Otomatis: Mengambil dan menyimpan daftar akun Google yang sedang masuk secara otomatis dari halaman opsi keluar Google untuk akurasi indeks.

## Cara Pemasangan

### Metode 1: Pasang melalui CRX (Disarankan)
1. Buka halaman Releases di repositori GitHub ini.
2. Unduh file `AkunSwitcher.crx` dari rilis terbaru.
3. Buka browser Google Chrome dan navigasikan ke `chrome://extensions/`.
4. Aktifkan mode pengembang (Developer mode) di sudut kanan atas.
5. Seret dan jatuhkan (drag and drop) file `AkunSwitcher.crx` yang telah diunduh ke halaman ekstensi tersebut untuk memasangnya.

### Metode 2: Muat Tanpa Kemasan (Untuk Pengembang)
1. Klon (clone) repositori ini atau unduh kode sumber dalam format ZIP.
2. Jika mengunduh ZIP, ekstrak file tersebut ke dalam sebuah folder.
3. Buka Google Chrome dan masuk ke `chrome://extensions/`.
4. Aktifkan mode pengembang (Developer mode).
5. Klik tombol "Load unpacked" dan pilih folder yang berisi file ekstensi ini.

## Cara Penggunaan

1. Klik ikon ekstensi di bilah alat (toolbar) Chrome Anda.
2. Pilih Layanan Google yang ingin Anda atur dari menu pilihan pertama.
3. Pilih Akun Google yang ingin Anda gunakan untuk layanan tersebut dari menu pilihan kedua.
4. Pastikan sakelar "Aktifkan Auto-Redirect Link" dalam keadaan menyala (aktif).
5. Mulai sekarang, setiap kali Anda membuka tautan ke layanan tersebut, ekstensi akan otomatis mengalihkan Anda ke akun yang telah dipilih.

## Cara Kerja Ekstensi

1. **Penyimpanan Lokal (chrome.storage)**: Saat Anda memilih akun untuk layanan tertentu melalui antarmuka pop-up, ekstensi akan menyimpan pengaturan tersebut (berupa angka indeks akun seperti `0`, `1`, `2`) ke dalam penyimpanan lokal peramban Anda.
2. **Sinkronisasi Akun**: Ekstensi dapat menyinkronkan daftar akun dengan cara membaca halaman opsi keluar Google secara otomatis. Dari sana, ekstensi mengenali profil akun beserta gambar avatarnya (hanya membaca data publik secara lokal tanpa memerlukan kata sandi).
3. **Pengalihan Tautan (Web Navigation)**: Ekstensi secara aktif memantau lalu lintas peramban Anda (menggunakan API `chrome.webNavigation`). Ketika mendeteksi Anda membuka layanan Google tertentu (misalnya `drive.google.com`) tanpa parameter akun yang spesifik, ekstensi akan langsung menyisipkan URL parameter (`?authuser=X` atau `/u/X/`) sesuai dengan akun yang Anda pilih sebelumnya, lalu memuat ulang halaman tersebut dengan akun yang tepat.

## Lisensi

Proyek ini bersifat sumber terbuka (open-source) dan bebas untuk digunakan.
