# Marquee Text - GNOME Shell Extension

Ekstensi GNOME Shell modern (arsitektur ESM) untuk menampilkan **teks berjalan (scrolling ticker)** di top bar/panel GNOME Shell. Teks, posisi (kiri, tengah, kanan), kecepatan, dan arah pergerakan dapat diatur secara interaktif melalui halaman Pengaturan (Preferences) maupun popup menu langsung di panel.

Kompatibel dengan **GNOME 45, 46, 47, 48, 50+**.

---

## ✨ Fitur Utama

- 📝 **Teks Berjalan Kustom**: Edit teks langsung dari menu Preferensi dengan pemisah loop kustom.
- 📍 **Posisi Panel Fleksibel**: Dapat dipindahkan ke **Kiri (Left)**, **Tengah (Center)**, atau **Kanan (Right)** secara dinamis tanpa restart shell.
- ⚡ **Pengaturan Kecepatan & Panjang Teks**: Sesuaikan interval waktu (ms) dan batas jumlah karakter yang tampak.
- 🔄 **Arah Gerak (RTL / LTR)**: Teks dapat bergerak dari kanan-ke-kiri maupun kiri-ke-kanan.
- 🛡️ **Aman untuk Karakter Unicode & Emoji**: Menggunakan `Intl.Segmenter` grapheme clusters sehingga emoji (🚀, ✨, 🔥, 🇮🇩, dll) tidak terpotong atau rusak.
- 🖱️ **Popup Menu Cepat**: Klik indikator di panel untuk Jeda/Lanjut (Pause/Resume), ganti posisi, ganti arah, atau membuka preferensi.
- 🎨 **Tampilan Modern Libadwaita**: UI pengaturan elegan yang menyatu dengan GNOME Desktop modern.

---

## 📁 Struktur Berkas

```
marquee-text/
├── metadata.json                                          # Informasi ekstensi & UUID
├── extension.js                                           # Logika utama (panel button, timer, ticker)
├── prefs.js                                               # Halaman pengaturan berbasis Libadwaita
├── stylesheet.css                                         # Gaya tampilan CSS untuk panel
├── schemas/
│   └── org.gnome.shell.extensions.marquee-text.gschema.xml # Skema preferensi GSettings
├── Makefile                                               # Otomasi compile, install, dan packaging
└── README.md                                              # Dokumentasi
```

---

## 🚀 Cara Uji Coba / Install di Komputer Sendiri (Lokal)

### 1. Compile Schema & Install ke Direktori Ekstensi
Jalankan perintah berikut di dalam folder project:
```bash
make install
```
*(Perintah ini akan meng-compile schema dan menyalin file ekstensi ke direktori `~/.local/share/gnome-shell/extensions/marquee-text@fahrudin.dev/`)*

### 2. Muat Ulang GNOME Shell
- **Jika menggunakan Wayland**: Logout akun Anda, lalu Login kembali.
- **Jika menggunakan X11**: Tekan tombol `Alt + F2`, ketik `r`, lalu tekan `Enter`.

### 3. Aktifkan Ekstensi
```bash
make enable
# atau:
gnome-extensions enable marquee-text@fahrudin.dev
```

### 4. Buka Halaman Pengaturan (Preferences)
```bash
make prefs
# atau:
gnome-extensions prefs marquee-text@fahrudin.dev
```
Anda juga bisa membukanya melalui aplikasi **Extension Manager** atau **Extensions**.

---

## 📦 Cara Membuat Paket ZIP untuk Upload ke GNOME Extensions

Website [extensions.gnome.org/upload/](https://extensions.gnome.org/upload/) mewajibkan ekstensi di-upload dalam format `.zip`.

### 1. Buat Berkas ZIP
Cukup jalankan:
```bash
make pack
```
Perintah ini akan menghasilkan file bernama:
`marquee-text@fahrudin.dev.shell-extension.zip`

### 2. (Opsional) Uji dengan Static Analyzer `shexli`
Untuk memastikan tidak ada kesalahan sebelum di-upload ke review GNOME:
```bash
python3 -m pip install -U shexli
shexli marquee-text@fahrudin.dev.shell-extension.zip
```

### 3. Langkah Upload ke Website
1. Buka [https://extensions.gnome.org/upload/](https://extensions.gnome.org/upload/)
2. Klik tombol **Choose File** / **Pilih Berkas**.
3. Pilih berkas zip yang baru dibuat:
   `/home/fahrudin/Projects/marquee-text/marquee-text@fahrudin.dev.shell-extension.zip`
4. Centang kedua kotak persetujuan:
   - *Agreement with GNOME Shell license*
   - *Maintainership agreement*
5. Klik **Upload extension**.
6. Tim reviewer GNOME akan memeriksa ekstensi Anda dan mengirimkan notifikasi via email setelah disetujui! 🎉
