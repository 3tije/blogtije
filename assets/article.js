const CFG=window.BLOG_TIJECONFIG||{};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=v=>{try{return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v))}catch{return v||""}};
const slug=new URLSearchParams(location.search).get("slug");
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
async function load(){
  if(!slug){show404();return}
  try{
    const r=await fetch(`${CFG.API_URL}?action=get&slug=${encodeURIComponent(slug)}&_=${Date.now()}`);
    const j=await r.json(); if(!j.data){show404();return} render(j.data);
  }catch(e){show404()}
}
function render(a){
  document.title=`${a.title} | Blog TIJE`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#123e36");
  $("#articleView").innerHTML=`<header class="article-head">
    <div class="meta"><span>${esc(a.category||"Catatan")}</span><span>•</span><span>${fmtDate(a.publishedAt)}</span></div>
    <h1>${esc(a.title)}</h1><p class="article-summary">${esc(a.summary||"")}</p>
  </header>
  <img class="article-cover" src="${esc(a.imageUrl||placeholder)}" alt="">
  <div class="article-content">${cleanHtml(a.content||"")}</div>
  <div class="share"><button onclick="shareArticle()">Bagikan</button><button onclick="copyLink()">Salin Link</button></div>`;
}
function show404(){$("#articleView").innerHTML='<div class="empty"><h2>Artikel tidak ditemukan</h2><p>Artikel mungkin belum diterbitkan atau tautannya berubah.</p><a class="readmore" href="./">← Kembali ke Blog TIJE</a></div>'}
window.shareArticle=async()=>{if(navigator.share){await navigator.share({title:document.title,url:location.href})}else copyLink()};
window.copyLink=async()=>{await navigator.clipboard.writeText(location.href);alert("Link artikel disalin.")};
load();