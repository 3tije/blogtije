const $=s=>document.querySelector(s);
const qs=s=>[...document.querySelectorAll(s)];
const CONFIG=window.BLOG_TIJECONFIG||{};
const CONFIG_API=String(CONFIG.API_URL||"").trim();
let API="",TOKEN="",CURRENT_ID="",ARTICLES=[];

const slugify=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const nowText=()=>new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date());

function notify(msg){const el=$("#saveInfo");if(el)el.textContent=msg}
function apiUrl(action,params={}){const u=new URL(API);u.searchParams.set("action",action);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));u.searchParams.set("_",Date.now());return u}
async function get(action,params={}){const r=await fetch(apiUrl(action,params));return await r.json()}
async function post(payload){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,token:TOKEN})});
  return await r.json()
}

function showLogin(){
  $("#loginView").classList.remove("hidden");
  $("#studioView").classList.add("hidden");
  $("#tokenInput").value="";
}
function showStudio(){
  $("#loginView").classList.add("hidden");
  $("#studioView").classList.remove("hidden");
}

$("#loginBtn").onclick=async()=>{
  API=CONFIG_API || localStorage.getItem("tijeBlogApi") || "";
  const password=$("#tokenInput").value.trim();
  if(!API || API.includes("PASTE_APPS_SCRIPT")) return alert("URL backend belum dikonfigurasi. Isi sekali di assets/config.js.");
  if(!password)return alert("Masukkan Password Studio.");
  $("#loginBtn").disabled=true;
  $("#loginBtn").textContent="Memeriksa...";
  try{
    const j=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"auth",password})}).then(r=>r.json());
    if(!j.ok)throw new Error(j.error||"Akses ditolak");
    TOKEN=j.token||"";
    if(!TOKEN)throw new Error("Sesi login tidak diterima server.");
    localStorage.setItem("tijeBlogApi",API);
    localStorage.setItem("tijeBlogSession",TOKEN);
    $("#tokenInput").value="";
    showStudio();
    await loadList();
  }catch(e){
    showLogin();
    alert(e.message||"Tidak dapat masuk Studio.");
  }finally{
    $("#loginBtn").disabled=false;
    $("#loginBtn").textContent="Masuk Studio";
  }
};

$("#logoutBtn").onclick=()=>{
  localStorage.removeItem("tijeBlogSession");
  // Keep API URL because it is configuration, not a secret.
  API=CONFIG_API || localStorage.getItem("tijeBlogApi") || "";
  TOKEN="";
  showLogin();
};

$("#refreshBtn").onclick=loadList;
$("#filterStatus").onchange=renderList;
$("#newBtn").onclick=newArticle;
$("#resetBtn").onclick=newArticle;

async function boot(){
  API=CONFIG_API || localStorage.getItem("tijeBlogApi") || "";
  TOKEN=localStorage.getItem("tijeBlogSession")||"";
  if(!API || API.includes("PASTE_APPS_SCRIPT")){
    showLogin();
    return;
  }
  if(TOKEN){
    try{
      const j=await post({action:"adminList"});
      if(j.ok){
        showStudio();
        ARTICLES=j.data||[];
        renderList();
        notify(`Data diperbarui • ${nowText()}`);
        return;
      }
    }catch(e){}
    localStorage.removeItem("tijeBlogSession");
    TOKEN="";
  }
  showLogin();
}

async function loadList(){
  notify("Memuat data...");
  try{
    const j=await post({action:"adminList"});
    if(!j.ok)throw new Error(j.error);
    ARTICLES=j.data||[];renderList();notify(`Data diperbarui • ${nowText()}`);
  }catch(e){notify("Gagal memuat data");alert(e.message||"Gagal memuat.")}
}
function renderList(){
  const f=$("#filterStatus").value;
  const arr=ARTICLES.filter(a=>!f||a.status===f);
  $("#articleList").innerHTML=arr.map(a=>`<div class="item ${a.id===CURRENT_ID?"active":""}" data-id="${esc(a.id)}"><b>${esc(a.title||"(Tanpa judul)")}</b><small>${esc(a.category||"")} • ${a.status==="published"?"Terbit":"Draft"}</small></div>`).join("");
  qs(".item").forEach(el=>el.onclick=()=>editArticle(el.dataset.id));
}
function newArticle(){
  CURRENT_ID="";["idea","title","slug","summary","outline","imagePrompt","imageUrl","caption","hashtags"].forEach(id=>$("#"+id).value="");
  $("#editor").innerHTML="";$("#imagePreview").src="";$("#imagePreview").classList.add("hidden");$("#deleteBtn").classList.add("hidden");
  $("#category").value="P4GN & Penyuluhan";$("#tone").value="reflektif";notify("Tulisan baru");renderList();scrollTo({top:0,behavior:"smooth"});
}
function editArticle(id){
  const a=ARTICLES.find(x=>x.id===id);if(!a)return;
  CURRENT_ID=id;$("#idea").value=a.idea||"";$("#title").value=a.title||"";$("#slug").value=a.slug||"";$("#summary").value=a.summary||"";$("#outline").value=a.outline||"";$("#editor").innerHTML=a.content||"";$("#category").value=a.category||"Catatan TIJE";$("#tone").value=a.tone||"reflektif";$("#imagePrompt").value=a.imagePrompt||"";$("#imageUrl").value=a.imageUrl||"";$("#caption").value=a.caption||"";$("#hashtags").value=a.hashtags||"";
  if(a.imageUrl){$("#imagePreview").src=a.imageUrl;$("#imagePreview").classList.remove("hidden")}else $("#imagePreview").classList.add("hidden");
  $("#deleteBtn").classList.remove("hidden");notify(`${a.status==="published"?"Terbit":"Draft"} • ${a.updatedAt||""}`);renderList();scrollTo({top:0,behavior:"smooth"});
}
$("#title").addEventListener("input",()=>{if(!CURRENT_ID||!$("#slug").value)$("#slug").value=slugify($("#title").value)});

async function developIdea(){
  const idea=$("#idea").value.trim();
  if(!idea)return alert("Masukkan ide tulisan terlebih dahulu.");
  const btn=$("#developBtn");
  btn.disabled=true; btn.textContent="Sedang mengolah...";
  notify("Mengirim ide...");
  try{
    const j=await post({
      action:"generateContent",
      idea,
      category:$("#category").value,
      tone:$("#tone").value
    });
    if(!j.ok)throw new Error(j.error||"Gagal mengembangkan ide.");
    const d=j.data||{};
    $("#title").value=d.title||"";
    $("#slug").value=slugify(d.title||"");
    $("#summary").value=d.summary||"";
    $("#outline").value=d.outline||"";
    $("#editor").innerHTML=d.content||"";
    $("#caption").value=d.caption||"";
    $("#hashtags").value=d.hashtags||"";
    $("#imagePrompt").value=d.imagePrompt||"";
    notify("Pengembangan selesai. Silakan edit hasilnya.");
    scrollTo({top:$("#title").closest(".panel").offsetTop-20,behavior:"smooth"});
  }catch(e){
    alert(e.message||"Gagal mengolah ide dengan AI.");
    notify("Gagal mengembangkan ide.");
  }finally{
    btn.disabled=false; btn.textContent="Kembangkan Tulisan";
  }
}
$("#developBtn").onclick=developIdea;
$("#outlineToContentBtn").onclick=()=>{
  const title=$("#title").value||"Judul Tulisan",idea=$("#idea").value,lines=$("#outline").value.split("\n").filter(Boolean);
  $("#editor").innerHTML=`<p>${esc(idea)}</p>`+lines.map((x,i)=>`<h2>${esc(x.replace(/^\d+\.\s*/,"").split("—")[0].trim())}</h2><p>${i===0?"Mulailah dengan pengalaman, pengamatan, atau pertanyaan yang membuat pembaca merasa dekat dengan persoalan ini.":"Kembangkan bagian ini dengan contoh, pengalaman, data yang relevan, dan refleksi pribadi."}</p>`).join("");
  notify("Draft artikel dibuat dari kerangka.");
};
function aiPrompt(){
  return `Saya sedang menulis artikel untuk Blog TIJE. Kembangkan ide berikut menjadi artikel berbahasa Indonesia yang hangat, reflektif, bernas, tidak terlalu formal, dan tetap terasa sebagai tulisan manusia.\n\nIDE:\n${$("#idea").value}\n\nKATEGORI: ${$("#category").value}\nSUDUT: ${$("#tone").value}\n\nGunakan struktur: pembuka yang kuat, konteks, 3–5 gagasan utama, contoh atau refleksi, lalu penutup yang membekas. Hindari bahasa klise, jargon berlebihan, dan jangan mengarang data. Jika perlu data faktual, beri tanda [PERLU SUMBER].\n\nBerikan: 3 alternatif judul, ringkasan 2 kalimat, artikel lengkap, caption Instagram singkat, dan 8–12 hashtag relevan.`;
}
$("#copyAiBtn").onclick=async()=>{await navigator.clipboard.writeText(aiPrompt());notify("Prompt artikel disalin. Tempelkan ke ChatGPT.")};

function makeImagePrompt(){
  const t=$("#title").value||$("#idea").value||"Artikel Blog TIJE",fmt=$("#imageFormat").value,style=$("#imageStyle").value;
  $("#imagePrompt").value=`Buat visual utama untuk artikel berjudul "${t}". Tema: ${$("#category").value}. Gaya ${style}, profesional, hangat, human-centered, modern, bersih, tidak penuh elemen. Komposisi kuat untuk rasio ${fmt}. Hindari simbol kriminal, adegan sensasional, watermark, logo palsu, dan teks panjang di dalam gambar. Jika perlu teks, cukup judul pendek yang sangat terbaca. Nuansa visual selaras dengan identitas Blog TIJE: intelektual, reflektif, hijau alami, dan kontemporer.`;
}
$("#genPromptBtn").onclick=()=>{makeImagePrompt();notify("Prompt gambar siap.")};
$("#copyPromptBtn").onclick=async()=>{if(!$("#imagePrompt").value)makeImagePrompt();await navigator.clipboard.writeText($("#imagePrompt").value);notify("Prompt gambar disalin. Tempelkan ke ChatGPT.")};
$("#imageFormat").onchange=makeImagePrompt;$("#imageStyle").onchange=makeImagePrompt;

function makeDistribution(){
  const t=$("#title").value||$("#idea").value,summary=$("#summary").value||$("#idea").value;
  $("#caption").value=`${t}\n\n${summary}\n\nBaca selengkapnya di blog.mytije.com`;
  const map={"P4GN & Penyuluhan":"#P4GN #Penyuluhan #Penyuluh #Edukasi","Pengembangan Diri":"#PengembanganDiri #Belajar #Refleksi","Teknologi & AI":"#Teknologi #AI #Digital","Buku & Literasi":"#Buku #Literasi #Menulis","Catatan TIJE":"#CatatanTIJE #Refleksi","Opini":"#Opini #Perspektif"};
  $("#hashtags").value=`${map[$("#category").value]||"#BlogTIJE"} #BlogTIJE #mytije`;
}
$("#category").onchange=makeDistribution;

qs(".mini-tools button").forEach(b=>b.onclick=()=>{document.execCommand(b.dataset.cmd,false,b.dataset.val||null);$("#editor").focus()});

$("#uploadBtn").onclick=async()=>{
  const f=$("#imageFile").files[0];if(!f)return alert("Pilih file gambar.");
  if(f.size>4*1024*1024)return alert("Ukuran gambar maksimal 4 MB.");
  notify("Mengunggah gambar...");
  const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f)});
  try{
    const j=await post({action:"uploadImage",filename:f.name,mimeType:f.type,data:base64});
    if(!j.ok)throw new Error(j.error);$("#imageUrl").value=j.url;$("#imagePreview").src=j.url;$("#imagePreview").classList.remove("hidden");notify("Gambar berhasil diunggah.");
  }catch(e){alert(e.message||"Upload gagal.");notify("Upload gagal")}
};

function collect(status){
  return {action:"saveArticle",id:CURRENT_ID,title:$("#title").value.trim(),slug:slugify($("#slug").value||$("#title").value),summary:$("#summary").value.trim(),content:$("#editor").innerHTML,idea:$("#idea").value.trim(),outline:$("#outline").value.trim(),category:$("#category").value,tone:$("#tone").value,imageUrl:$("#imageUrl").value.trim(),imagePrompt:$("#imagePrompt").value.trim(),caption:$("#caption").value.trim(),hashtags:$("#hashtags").value.trim(),status};
}
async function save(status){
  const d=collect(status);if(!d.title)return alert("Judul belum diisi.");if(status==="published"&&!d.content.trim())return alert("Isi artikel belum ada.");
  notify(status==="published"?"Menerbitkan...":"Menyimpan draft...");
  try{const j=await post(d);if(!j.ok)throw new Error(j.error);CURRENT_ID=j.id;await loadList();editArticle(CURRENT_ID);notify(status==="published"?"Artikel diterbitkan.":"Draft disimpan.");}catch(e){alert(e.message||"Gagal menyimpan.");notify("Gagal menyimpan")}
}
$("#saveDraftBtn").onclick=()=>save("draft");$("#publishBtn").onclick=()=>{makeDistribution();save("published")};
$("#deleteBtn").onclick=async()=>{if(!CURRENT_ID||!confirm("Hapus tulisan ini?"))return;const j=await post({action:"deleteArticle",id:CURRENT_ID});if(j.ok){newArticle();loadList()}else alert(j.error||"Gagal menghapus.")};
boot();