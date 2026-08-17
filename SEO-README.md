# Blog TIJE — SEO v2.4

Perubahan utama:
- robots.txt ditambahkan dan Studio dikecualikan dari crawling.
- sitemap.xml ditambahkan.
- homepage memiliki canonical, Open Graph, Twitter Card, robots dan WebSite schema.
- halaman artikel mengisi title, description, canonical, OG/Twitter dan BlogPosting schema berdasarkan data artikel.
- gambar artikel/kartu memakai alt berdasarkan judul.

Catatan: sistem Blog TIJE saat ini menggunakan `article.html?slug=...`, sehingga canonical artikel mengikuti URL tersebut. Jangan mengubah struktur URL secara manual sebelum mekanisme routing/generasi halaman artikel disiapkan.

Setelah upload ke GitHub Pages:
1. buka https://blog.mytije.com/robots.txt
2. buka https://blog.mytije.com/sitemap.xml
3. daftarkan/verifikasi `blog.mytije.com` di Google Search Console.
4. submit sitemap `sitemap.xml`.
5. gunakan URL Inspection untuk homepage dan artikel penting.
