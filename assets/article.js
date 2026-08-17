const CFG=window.BLOG_TIJECONFIG||{};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=v=>{try{return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v))}catch{return v||""}};
const slug=new URLSearchParams(location.search).get("slug");
const siteUrl=(CFG.SITE_URL||location.origin).replace(/\/$/,"");
const articleUrl=a=>`${siteUrl}/article.html?slug=${encodeURIComponent(a.slug||"")}`;
const placeholder=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#e7efeb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#537067" font-family="Arial" font-size="52">BLOG TIJE</text></svg>')}`;

function cleanHtml(html=""){
  const t=document.createElement("template");t.innerHTML=html;
  t.content.querySelectorAll("script,iframe,object,embed,form,input,button").forEach(x=>x.remove());
  t.content.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{
    if(a.name.toLowerCase().startsWith("on"))el.removeAttribute(a.name);
    if(["href","src"].includes(a.name.toLowerCase())&&/^javascript:/i.test(a.value))el.removeAttribute(a.name);
  }));
  return t.innerHTML;
}
function setMeta(selector, attr, value){const el=document.querySelector(selector); if(el) el.setAttribute(attr,value);}
function setSEO(a){
  const title=`${a.title} | Blog TIJE`;
  const desc=String(a.summary||"Blog TIJE — gagasan, catatan, dan perspektif.").replace(/\s+/g," ").trim().slice(0,160);
  const url=articleUrl(a);
  const image=a.imageUrl||`${siteUrl}/assets/mytije-icon-512.png`;
  document.title=title;
  setMeta('meta[name="description"]','content',desc);
  setMeta('link[rel="canonical"]','href',url);
  setMeta('meta[property="og:title"]','content',title);
  setMeta('meta[property="og:description"]','content',desc);
  setMeta('meta[property="og:url"]','content',url);
  setMeta('meta[property="og:image"]','content',image);
  setMeta('meta[name="twitter:title"]','content',title);
  setMeta('meta[name="twitter:description"]','content',desc);
  setMeta('meta[name="twitter:image"]','content',image);
  const schema={
    "@context":"https://schema.org",
    "@type":"BlogPosting",
    "headline":String(a.title||"Blog TIJE").slice(0,110),
    "description":desc,
    "datePublished":a.publishedAt||a.createdAt||undefined,
    "dateModified":a.updatedAt||a.publishedAt||a.createdAt||undefined,
    "mainEntityOfPage":{"@type":"WebPage","@id":url},
    "url":url,
    "author":{"@type":"Person","name":"Tri Tjahyono"},
    "publisher":{"@type":"Organization","name":"Blog TIJE","url":siteUrl},
    "image":image
  };
  Object.keys(schema).forEach(k=>schema[k]===undefined&&delete schema[k]);
  const el=document.getElementById("articleSchema"); if(el) el.textContent=JSON.stringify(schema);
}
async function load(){
  if(!slug){show404();return}
  try{
    const r=await fetch(`${CFG.API_URL}?action=get&slug=${encodeURIComponent(slug)}&_=${Date.now()}`);
    const j=await r.json(); if(!j.data){show404();return} render(j.data);
  }catch(e){console.error(e);show404()}
}
function render(a){
  setSEO(a);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#123e36");
  const image=a.imageUrl||placeholder;
  $("#articleView").innerHTML=`<header class="article-head">
    <div class="meta"><span>${esc(a.category||"Catatan")}</span><span>•</span><span>${fmtDate(a.publishedAt)}</span></div>
    <h1>${esc(a.title)}</h1><p class="article-summary">${esc(a.summary||"")}</p>
  </header>
  <img class="article-cover" src="${esc(image)}" alt="${esc(a.title||"Artikel Blog TIJE")}" loading="eager" fetchpriority="high">
  <div class="article-content">${cleanHtml(a.content||"")}</div>
  <div class="share"><button onclick="shareArticle()">Bagikan</button><button onclick="copyLink()">Salin Link</button></div>`;
}
function show404(){
  document.title="Artikel tidak ditemukan | Blog TIJE";
  $("#articleView").innerHTML='<div class="empty"><h2>Artikel tidak ditemukan</h2><p>Artikel mungkin belum diterbitkan atau tautannya berubah.</p><a class="readmore" href="./">← Kembali ke Blog TIJE</a></div>';
}
window.shareArticle=async()=>{if(navigator.share){await navigator.share({title:document.title,url:location.href})}else copyLink()};
window.copyLink=async()=>{try{await navigator.clipboard.writeText(location.href);alert("Link artikel disalin.")}catch(e){prompt("Salin link artikel:",location.href)}};
load();
