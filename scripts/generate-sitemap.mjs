import { writeFileSync } from "node:fs";

const SITE_URL = "https://blog.mytije.com";
const API_URL = "https://script.google.com/macros/s/AKfycbyYkvF5ycJOSp6X-NxZ-lpIUX1a2Z4Eyr7eLGUp_n47WVSYMKSN3Q890HX6Uc7ggUw/exec";

const esc = (v) => String(v ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const iso = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const response = await fetch(`${API_URL}?action=list&_=${Date.now()}`);
if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);
const json = await response.json();
if (!json.ok || !Array.isArray(json.data)) throw new Error("Respons API Blog TIJE tidak valid.");

const articles = json.data
  .filter(a => String(a.status || "").toLowerCase() === "published" && a.slug)
  .sort((a,b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));

const urls = [
  `  <url>\n    <loc>${SITE_URL}/</loc>\n  </url>`,
  ...articles.map(a => {
    const loc = `${SITE_URL}/article.html?slug=${encodeURIComponent(String(a.slug))}`;
    const lastmod = iso(a.updatedAt || a.publishedAt);
    return `  <url>\n    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
  })
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
writeFileSync("sitemap.xml", xml, "utf8");
console.log(`Sitemap dibuat: ${articles.length} artikel + homepage.`);
