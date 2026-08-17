# BLOG TIJE — FINAL GEMINI FREE v2.1

## Konsep

Bro cukup memasukkan **satu ide tulisan**.

**IDE → KEMBANGKAN DENGAN GEMINI → ARTIKEL → EDIT → PROMPT GAMBAR → UPLOAD → PUBLISH**

Satu panggilan Gemini menghasilkan:
- judul
- ringkasan
- outline
- artikel lengkap
- caption
- hashtag
- prompt gambar

Gambar tetap hybrid: **tidak dibuat oleh API Blog TIJE**. Prompt dicopy ke ChatGPT, gambar dibuat di sana, lalu hasilnya di-upload ke Studio.

## Mesin AI

Paket ini memakai:

`gemini-3.6-flash`

melalui **AI API**, endpoint yang sekarang direkomendasikan Google untuk project baru. Google menyatakan `generateContent` masih didukung, tetapi Interactions API adalah jalur yang direkomendasikan untuk project baru.

Free Tier Gemini menyediakan input/output gratis untuk model yang termasuk Free Tier, dengan batas pemakaian. Jika kuota tercapai, aplikasi menampilkan error kuota dan **tidak melakukan fallback otomatis ke billing**.

## 1. Apps Script

Buat/siapkan Spreadsheet Blog TIJE.

Extensions → Apps Script → tempel:

`apps-script/Code.gs`

Jalankan:

`setupBlogTije()`

Jangan jalankan kode OpenAI apa pun. Paket ini **tidak memakai OpenAI**.

## 2. Simpan AI API Key

Apps Script → Project Settings ⚙️ → Script Properties → Add script property.

Nama:

`GEMINI_API_KEY`

Nilai:

API Key Gemini milik Bro.

Simpan.

**Jangan kirim key ke chat dan jangan masukkan key ke GitHub/frontend.**

## 3. Tes Gemini

Pada dropdown fungsi Apps Script pilih:

`testGemini`

Klik **Jalankan**.

Jika berhasil, log akan menunjukkan respons dari model `gemini-3.6-flash`.

Jika `429`, berarti rate limit/kuota Free Tier sedang tercapai.

Jika `401` atau `403`, periksa API key/project.

Jika `404`, kirim screenshot error — jangan mengubah kode sendiri.

## 4. Folder gambar

Buat folder Google Drive:

`Blog TIJE Images`

Kemudian jalankan fungsi:

`setImageFolderId("FOLDER_ID_ANDA")`

## 5. Deploy backend

Deploy → New deployment → Web app

Execute as:
`Me`

Who has access:
`Anyone`

Salin URL `/exec`.

## 6. Hubungkan frontend

Buka:

`assets/config.js`

Isi:

`API_URL: "URL_APPS_SCRIPT_ANDA"`

Jangan memasukkan GEMINI_API_KEY ke file ini.

## 7. GitHub Pages

Upload isi paket ke repository.

File `CNAME`:

`blog.mytije.com`

Aktifkan GitHub Pages dari branch utama.

## 8. Studio Admin

Akses:

`https://blog.mytije.com/studio/`

Login memakai:
- URL Apps Script Web App
- **Password Studio**

Password disimpan di Script Properties Apps Script dan diverifikasi oleh backend.

Set password pertama kali dari Apps Script dengan menjalankan:

`setStudioPassword("PASSWORD_ANDA")`

Password minimal 8 karakter.

Setelah login berhasil, browser menyimpan **session token**, bukan password. Session berlaku sampai 30 hari. Logout menghapus session dari perangkat.

## 9. Alur menulis

1. Masukkan satu ide.
2. Klik **Kembangkan Tulisan**.
3. Gemini mengisi seluruh bahan tulisan.
4. Bro edit artikel.
5. Copy prompt gambar.
6. Buat gambar di ChatGPT.
7. Upload gambar.
8. Simpan Draft atau Publish.

## Proteksi biaya

Paket ini:
- tidak memakai OpenAI API;
- tidak memakai API gambar;
- tidak melakukan fallback otomatis ke layanan berbayar;
- menyimpan key hanya di Apps Script Script Properties.

Selama project tetap pada Free Tier dan tidak di-upgrade ke Paid Tier, penggunaan mengikuti batas Free Tier. Google saat ini mencantumkan `gemini-3.6-flash` dengan **Free Tier: input gratis dan output gratis**. 

## Struktur

- `index.html` — blog publik
- `article.html` — halaman artikel
- `assets/` — frontend
- `studio/` — admin/writing studio
- `apps-script/Code.gs` — backend + Gemini
- `CNAME` — domain blog


## Identitas visual

Blog publik dan Writing Studio menggunakan ikon MyTije yang sama. Ikon tersedia di `assets/mytije-icon-*.png`.

## Login final

URL backend cukup dikonfigurasi satu kali di `assets/config.js`. Setelah itu halaman login hanya meminta Password Studio. Session perangkat disimpan 30 hari dan diverifikasi ke backend saat dibuka kembali.


## SEO Google

- `robots.txt` mengizinkan crawler dan mengecualikan `/studio/`.
- `sitemap.xml` diperbarui otomatis melalui GitHub Actions berdasarkan artikel dengan status `published` di Apps Script.
- Workflow `Update Blog TIJE sitemap` berjalan setiap jam dan dapat dijalankan manual melalui tab **Actions**.
- Setelah workflow pertama berhasil, cek `https://blog.mytije.com/sitemap.xml`, lalu kirim sitemap tersebut di Google Search Console.
- URL artikel saat ini tetap menggunakan `article.html?slug=...` agar kompatibel dengan arsitektur Blog TIJE yang sudah berjalan.
