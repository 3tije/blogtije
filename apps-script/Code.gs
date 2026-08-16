const SHEET_NAME = 'Articles';
const PROP_STUDIO_KEY = 'STUDIO_KEY';
const PROP_STUDIO_PASSWORD = 'STUDIO_PASSWORD';
const PROP_SESSION_SECRET = 'SESSION_SECRET';
const SESSION_DAYS = 30;
const PROP_IMAGE_FOLDER_ID = 'IMAGE_FOLDER_ID';

function doGet(e) {
  try {
    const action = String((e.parameter || {}).action || 'list');
    if (action === 'list') return json_({ok:true, data:listPublished_()});
    if (action === 'get') return json_({ok:true, data:getPublishedBySlug_(String(e.parameter.slug||''))});
    return json_({ok:false,error:'Action tidak dikenal.'});
  } catch (err) {
    return json_({ok:false,error:String(err.message||err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    if (action === 'auth') {
      const password = PropertiesService.getScriptProperties().getProperty(PROP_STUDIO_PASSWORD);
      if (!password) throw new Error('Password Studio belum disiapkan. Jalankan setStudioPassword("...") satu kali.');
      if (String(body.password || '') !== String(password)) throw new Error('Password Studio salah.');
      return json_({ok:true, token:createSessionToken_()});
    }
    verifySession_(body.token);
    if (action === 'adminList') return json_({ok:true,data:listAll_()});
    if (action === 'saveArticle') return json_(saveArticle_(body));
    if (action === 'deleteArticle') return json_(deleteArticle_(body.id));
    if (action === 'uploadImage') return json_(uploadImage_(body));
    if (action === 'generateContent') return json_(generateContent_(body));
    return json_({ok:false,error:'Action tidak dikenal.'});
  } catch (err) {
    return json_({ok:false,error:String(err.message||err)});
  }
}

function setupBlogTije() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const headers = [
    'id','slug','title','summary','content','category','tone','idea','outline',
    'imageUrl','imagePrompt','caption','hashtags','status','featured',
    'createdAt','updatedAt','publishedAt'
  ];
  sh.clear();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#123e36').setFontColor('#ffffff');
  sh.autoResizeColumns(1,headers.length);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PROP_STUDIO_KEY)) {
    props.setProperty(PROP_STUDIO_KEY, Utilities.getUuid().replace(/-/g,''));
  }
  if (!props.getProperty(PROP_SESSION_SECRET)) {
    props.setProperty(PROP_SESSION_SECRET, Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''));
  }
  Logger.log('STUDIO_KEY: ' + props.getProperty(PROP_STUDIO_KEY));
}

function setStudioKey(key) {
  if (!key || String(key).length < 8) throw new Error('Kunci minimal 8 karakter.');
  PropertiesService.getScriptProperties().setProperty(PROP_STUDIO_KEY, String(key));
}

function setStudioPassword(password) {
  password = String(password || '').trim();
  if (password.length < 8) throw new Error('Password minimal 8 karakter.');
  PropertiesService.getScriptProperties().setProperty(PROP_STUDIO_PASSWORD, password);
  return 'Password Studio berhasil disimpan.';
}

function createSessionToken_() {
  const secret = PropertiesService.getScriptProperties().getProperty(PROP_SESSION_SECRET);
  if (!secret) throw new Error('SESSION_SECRET belum disiapkan. Jalankan setupBlogTije().');
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(exp);
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, secret)
  ).replace(/=+$/,'');
  return payload + '.' + sig;
}

function verifySession_(token) {
  const secret = PropertiesService.getScriptProperties().getProperty(PROP_SESSION_SECRET);
  if (!secret) throw new Error('SESSION_SECRET belum disiapkan.');
  const parts = String(token || '').split('.');
  if (parts.length !== 2) throw new Error('Sesi tidak valid. Silakan login kembali.');
  const exp = Number(parts[0]);
  if (!exp || Date.now() > exp) throw new Error('Sesi telah berakhir. Silakan login kembali.');
  const expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(parts[0], secret)
  ).replace(/=+$/,'');
  if (parts[1] !== expected) throw new Error('Sesi tidak valid. Silakan login kembali.');
}

function setImageFolderId(folderId) {
  DriveApp.getFolderById(folderId); // validasi
  PropertiesService.getScriptProperties().setProperty(PROP_IMAGE_FOLDER_ID, folderId);
}

function verifyToken_(token) {
  const key = PropertiesService.getScriptProperties().getProperty(PROP_STUDIO_KEY);
  if (!key) throw new Error('STUDIO_KEY belum disiapkan. Jalankan setupBlogTije().');
  if (String(token||'') !== String(key)) throw new Error('Kunci Studio salah.');
}

function sh_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Sheet Articles belum ada. Jalankan setupBlogTije().');
  return sh;
}

function rows_() {
  const sh=sh_(), values=sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers=values.shift();
  return values.filter(r=>r.some(v=>v!=='')).map((r,i)=>{
    const o={_row:i+2};headers.forEach((h,j)=>o[h]=r[j]);return o;
  });
}

function listPublished_() {
  return rows_().filter(x=>x.status==='published')
    .sort((a,b)=>new Date(b.publishedAt||b.updatedAt)-new Date(a.publishedAt||a.updatedAt));
}

function getPublishedBySlug_(slug) {
  return listPublished_().find(x=>String(x.slug)===slug) || null;
}

function listAll_() {
  return rows_().sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
}

function saveArticle_(b) {
  const sh=sh_(), all=rows_(), now=new Date();
  const id=String(b.id||Utilities.getUuid());
  const old=all.find(x=>String(x.id)===id);
  const status=String(b.status||'draft');
  const pubAt=status==='published' ? (old && old.publishedAt ? old.publishedAt : now) : (old ? old.publishedAt : '');
  const rec = {
    id:id,
    slug:String(b.slug||'').trim(),
    title:String(b.title||'').trim(),
    summary:String(b.summary||'').trim(),
    content:String(b.content||''),
    category:String(b.category||'Catatan TIJE'),
    tone:String(b.tone||'reflektif'),
    idea:String(b.idea||''),
    outline:String(b.outline||''),
    imageUrl:String(b.imageUrl||''),
    imagePrompt:String(b.imagePrompt||''),
    caption:String(b.caption||''),
    hashtags:String(b.hashtags||''),
    status:status,
    featured: old ? old.featured : false,
    createdAt: old ? old.createdAt : now,
    updatedAt: now,
    publishedAt: pubAt
  };
  if (!rec.title) throw new Error('Judul wajib diisi.');
  if (!rec.slug) throw new Error('Slug wajib diisi.');
  const duplicate=all.find(x=>String(x.slug)===rec.slug && String(x.id)!==id);
  if (duplicate) throw new Error('Slug sudah digunakan artikel lain.');

  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const row=headers.map(h=>rec[h]!==undefined?rec[h]:'');
  if (old) sh.getRange(old._row,1,1,row.length).setValues([row]);
  else sh.appendRow(row);
  return {ok:true,id:id};
}

function deleteArticle_(id) {
  const old=rows_().find(x=>String(x.id)===String(id));
  if (!old) return {ok:false,error:'Tulisan tidak ditemukan.'};
  sh_().deleteRow(old._row);
  return {ok:true};
}

function uploadImage_(b) {
  const folderId=PropertiesService.getScriptProperties().getProperty(PROP_IMAGE_FOLDER_ID);
  if (!folderId) throw new Error('IMAGE_FOLDER_ID belum diatur. Jalankan setImageFolderId("...").');
  if (!b.data || !b.filename || !b.mimeType) throw new Error('Data gambar tidak lengkap.');
  const bytes=Utilities.base64Decode(String(b.data));
  if (bytes.length > 4*1024*1024) throw new Error('Ukuran gambar maksimal 4 MB.');
  const allowed=['image/jpeg','image/png','image/webp'];
  if (!allowed.includes(String(b.mimeType))) throw new Error('Format gambar harus JPG, PNG, atau WebP.');
  const blob=Utilities.newBlob(bytes,String(b.mimeType),String(b.filename));
  const file=DriveApp.getFolderById(folderId).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  const url='https://drive.google.com/thumbnail?id='+file.getId()+'&sz=w1600';
  return {ok:true,url:url,fileId:file.getId()};
}



const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function generateContent_(b) {
  const idea = String(b.idea || '').trim();
  const category = String(b.category || 'Catatan TIJE').trim();
  const tone = String(b.tone || 'reflektif').trim();

  if (!idea) throw new Error('Ide tulisan wajib diisi.');

  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY belum disimpan di Project Settings → Script properties.');
  }

  const instruction = [
    'Anda adalah editor utama Blog TIJE.',
    'Kembangkan satu ide pribadi menjadi artikel berbahasa Indonesia yang bernas, hangat, reflektif, manusiawi, dan enak dibaca.',
    'Pertahankan suara penulis yang personal dan profesional.',
    'Hindari jargon berlebihan, kalimat motivasi klise, dan pengulangan.',
    'Jangan mengarang data atau fakta. Jika membutuhkan fakta yang tidak tersedia dari ide, tulis [PERLU SUMBER].',
    'Jangan menyebut bahwa tulisan dibuat oleh AI.',
    '',
    'KATEGORI: ' + category,
    'GAYA: ' + tone,
    'IDE PENULIS:',
    idea,
    '',
    'HASILKAN JSON SAJA dengan field:',
    'title, summary, outline, content, caption, hashtags, imagePrompt',
    '',
    'Ketentuan:',
    'title = satu judul utama yang kuat.',
    'summary = 2-3 kalimat untuk kartu artikel.',
    'outline = 6-8 bagian, satu bagian per baris.',
    'content = artikel lengkap sekitar 900-1400 kata sebagai HTML fragment yang aman; gunakan hanya p, h2, h3, strong, em, ul, ol, li, blockquote.',
    'caption = caption media sosial yang natural.',
    'hashtags = 8-12 hashtag relevan.',
    'imagePrompt = prompt gambar editorial profesional rasio 16:9; jangan membuat gambar; tanpa watermark atau logo palsu.',
    'Artikel harus memiliki pembuka kuat, pengembangan gagasan, contoh/refleksi, dan penutup yang membekas.'
  ].join('\n');

  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      outline: { type: 'string' },
      content: { type: 'string' },
      caption: { type: 'string' },
      hashtags: { type: 'string' },
      imagePrompt: { type: 'string' }
    },
    required: ['title','summary','outline','content','caption','hashtags','imagePrompt']
  };

  const payload = {
    model: GEMINI_MODEL,
    input: idea,
    system_instruction: instruction,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: schema
    },
    store: false
  };

  const res = UrlFetchApp.fetch(GEMINI_INTERACTIONS_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': key
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = res.getResponseCode();
  const text = res.getContentText();

  if (status < 200 || status >= 300) {
    let msg = text;
    try {
      const err = JSON.parse(text);
      if (err.error && err.error.message) msg = err.error.message;
    } catch (_) {}
    if (status === 429) {
      throw new Error('Kuota Gemini Free Tier sedang tercapai. Coba lagi nanti.');
    }
    throw new Error('Gemini API error ' + status + ': ' + msg.slice(0, 600));
  }

  const interaction = JSON.parse(text);
  let raw = '';

  // Interactions API returns model output in steps.
  const steps = interaction.steps || [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step && step.type === 'model_output' && Array.isArray(step.content)) {
      for (let j = 0; j < step.content.length; j++) {
        if (step.content[j] && step.content[j].type === 'text') {
          raw += step.content[j].text || '';
        }
      }
      if (raw) break;
    }
  }

  // Fallback for a response shape that exposes output directly.
  if (!raw && interaction.output_text) raw = interaction.output_text;

  if (!raw) throw new Error('Gemini tidak mengembalikan teks hasil.');

  raw = raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    throw new Error('Hasil Gemini bukan JSON yang valid. Silakan coba lagi.');
  }

  data.content = sanitizeGeneratedHtml_(String(data.content || ''));
  return { ok: true, data: data };
}

function sanitizeGeneratedHtml_(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function testGemini() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY belum disimpan di Script Properties.');

  const payload = {
    model: GEMINI_MODEL,
    input: 'Balas hanya dengan kata GEMINI-OK.',
    response_format: {
      type: 'text',
      mime_type: 'text/plain'
    },
    store: false
  };

  const res = UrlFetchApp.fetch(GEMINI_INTERACTIONS_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': key
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = res.getResponseCode();
  const text = res.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('Tes Gemini gagal (' + status + '): ' + text.slice(0, 600));
  }

  Logger.log('Tes Gemini berhasil. Model: ' + GEMINI_MODEL);
  Logger.log(text);
  return 'Tes Gemini berhasil.';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
