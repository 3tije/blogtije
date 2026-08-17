const CFG=window.BLOG_TIJECONFIG||{};
const $=s=>document.querySelector(s);
let ARTICLES=[], activeCat="Semua";

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmtDate=v=>{try{return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v))}catch{return v||""}};
const articleUrl=a=>`article.html?slug=${encodeURIComponent(a.slug)}`;
const placeholder=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#e7efeb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#537067" font-family="Arial" font-size="52">BLOG TIJE</text></svg>')}`;

async function load(){
  const url=CFG.API_URL;
  if(!url||url.includes("PASTE_")){demo();return}
  try{
    const r=await fetch(`${url}?action=list&status=published&_=${Date.now()}`);
    const j=await r.json();
    ARTICLES=Array.isArray(j.data)?j.data:[];
    render();
  }catch(e){console.error(e);demo()}
}
function demo(){
  ARTICLES=[{
    id:"demo-1",slug:"selamat-datang-di-blog-tije",title:"Selamat Datang di Blog TIJE",category:"Catatan TIJE",
    summary:"Ruang untuk menyimpan gagasan, pengalaman, dan perspektif yang ingin dibagikan lebih jauh.",
    imageUrl:"",publishedAt:new Date().toISOString(),featured:true
  }];
  render();
}
function render(){
  const cats=["Semua",...new Set(ARTICLES.map(a=>a.category).filter(Boolean))];
  $("#categoryChips").innerHTML=cats.map(c=>`<button class="chip ${c===activeCat?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{activeCat=b.dataset.cat;render()});
  const q=($("#searchInput").value||"").trim().toLowerCase();
  const filtered=ARTICLES.filter(a=>(activeCat==="Semua"||a.category===activeCat)&&(!q||`${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(q)));
  const feat=filtered.find(a=>String(a.featured)==="true"||a.featured===true)||filtered[0];
  $("#featured").innerHTML=feat?`<a class="featured-card" href="${articleUrl(feat)}">
    <img src="${esc(feat.imageUrl||placeholder)}" alt="${esc(feat.title)}">
    <div class="featured-copy"><div class="meta"><span>${esc(feat.category||"Catatan")}</span><span>•</span><span>${fmtDate(feat.publishedAt)}</span></div>
    <h2>${esc(feat.title)}</h2><p>${esc(feat.summary||"")}</p><span class="readmore">Baca selengkapnya →</span></div></a>`:"";
  const rest=filtered.filter(a=>!feat||a.id!==feat.id);
  $("#articleGrid").innerHTML=rest.map(a=>`<a class="card" href="${articleUrl(a)}"><img src="${esc(a.imageUrl||placeholder)}" alt="${esc(a.title)}"><div class="card-body">
    <div class="meta"><span>${esc(a.category||"Catatan")}</span><span>•</span><span>${fmtDate(a.publishedAt)}</span></div>
    <h3>${esc(a.title)}</h3><p>${esc(a.summary||"")}</p></div></a>`).join("");
  $("#emptyState").classList.toggle("hidden",filtered.length>0);
  const latest=ARTICLES[0]; if(latest){$("#heroTitle").textContent=latest.title;$("#heroLink").href=articleUrl(latest)}
}
$("#searchInput").addEventListener("input",render);
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("blog-theme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("blog-theme")==="dark")document.body.classList.add("dark");
load();