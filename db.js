// ── B-Mak ServicePro — db.js ── v13
// Supabase cloud DB with localStorage offline fallback
// v13: Photos uploadées dans Supabase Storage (bucket 'photos') au lieu de base64 dans la table

const SUPABASE_URL = 'https://rkvqnuljitffyiczbqky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdnFudWxqaXRmZnlpY3picWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTExMDYsImV4cCI6MjA5MzY4NzEwNn0.-6Taz1hg9n_TnrG7sgT4k_KqpJGtPFDEh6tsaTWU5r0';
const STORAGE_BUCKET = 'photos';

// ── Supabase client ──
var _sbClient = null;
function getSB() {
  if (!_sbClient && window.supabase && SUPABASE_URL !== 'PLACEHOLDER') {
    var cleanURL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    _sbClient = window.supabase.createClient(cleanURL, SUPABASE_KEY);
  }
  return _sbClient;
}

// ── Online/offline detection ──
let isOnline = navigator.onLine;
window.addEventListener('online',  () => { isOnline = true;  syncPending(); });
window.addEventListener('offline', () => { isOnline = false; });

// ── LocalStorage helpers ──
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem('bmak_' + k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem('bmak_' + k, JSON.stringify(v)); } catch(e) { console.warn('LS full', e); } },
};

// ── Pending sync queue ──
function getPending() { return LS.get('pending') || []; }
function addPending(op) { const q = getPending(); q.push(op); LS.set('pending', q); }

async function syncPending() {
  const sb = getSB(); if (!sb) return;
  const q = getPending(); if (!q.length) return;
  console.log(`Syncing ${q.length} pending operations...`);
  const failed = [];
  for (const op of q) {
    try {
      if (op.type === 'upsert') await sb.from(op.table).upsert(op.data);
      else if (op.type === 'delete') await sb.from(op.table).delete().eq('id', op.id);
    } catch(e) { failed.push(op); }
  }
  LS.set('pending', failed);
  if (!failed.length) console.log('Sync complete');
}

// ── Status indicator ──
function updateStatusBadge() {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  const pending = getPending().length;
  if (!isOnline) {
    el.textContent = '📴 Hors-ligne'; el.style.background = '#ff9500'; el.style.display = 'block';
  } else if (pending > 0) {
    el.textContent = '⏳ Sync...'; el.style.background = '#025373'; el.style.display = 'block';
    syncPending().then(updateStatusBadge);
  } else {
    el.textContent = '✅ Synchronisé'; el.style.background = '#34c759';
    setTimeout(() => { if(el) el.style.display = 'none'; }, 2000);
    el.style.display = 'block';
  }
}

// ──────────────────────────────────────────────
// PHOTO STORAGE — upload base64 → Storage URL
// ──────────────────────────────────────────────

/**
 * Prend un tableau de photos (base64 ou URLs déjà uploadées)
 * Uploade les base64 dans Storage et retourne un tableau d'URLs publiques
 */
async function uploadPhotos(rapportId, tacheIndex, photos) {
  const sb = getSB();
  if (!sb || !isOnline || !photos || !photos.length) return photos || [];

  const results = [];
  for (let i = 0; i < photos.length; i++) {
    const src = photos[i];
    // Déjà une URL publique Supabase → garder tel quel
    if (typeof src === 'string' && src.startsWith('https://')) {
      results.push(src);
      continue;
    }
    // C'est un base64 → uploader
    try {
      const blob = dataURLtoBlob(src);
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `${rapportId}/tache_${tacheIndex}_photo_${i}_${Date.now()}.${ext}`;
      const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true
      });
      if (error) {
        console.warn('Photo upload error:', error);
        results.push(src); // fallback: garder base64
      } else {
        const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        results.push(data.publicUrl);
      }
    } catch(e) {
      console.warn('Photo upload exception:', e);
      results.push(src); // fallback
    }
  }
  return results;
}

/**
 * Pour un rapport complet, uploade toutes les photos de toutes les tâches
 * et retourne le rapport avec les URLs à la place des base64
 */
async function uploadRapportPhotos(rapport) {
  if (!rapport.taches || !rapport.taches.length) return rapport;
  const taches = await Promise.all(rapport.taches.map(async (t, i) => {
    if (!t.photos || !t.photos.length) return t;
    const uploadedPhotos = await uploadPhotos(rapport.id, i, t.photos);
    return { ...t, photos: uploadedPhotos };
  }));
  return { ...rapport, taches };
}

/** Convertit un dataURL base64 en Blob */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// ── Generic CRUD ──
async function dbGet(table) {
  const sb = getSB();
  if (!sb || !isOnline) return LS.get(table) || [];
  let allData = [], from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999);
    if (error) { console.warn('dbGet error:', table, error); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (table === 'rapports') {
    allData = allData.map(r => {
      if (r.sig_img !== undefined) { r.sigImg = r.sig_img; }
      if (r.saved_at !== undefined) { r.savedAt = r.saved_at; }
      return r;
    });
  }
  // Cache sans les photos (photos = URLs courtes, pas de base64 → ok mais on strip quand même pour économiser LS)
  const cacheData = table === 'rapports'
    ? allData.map(r => ({...r, taches: r.taches ? r.taches.map(t => ({...t, photos: t.photos && t.photos.length ? t.photos.length : 0})) : r.taches}))
    : allData;
  LS.set(table, cacheData);
  return allData;
}

async function dbUpsert(table, row) {
  const sb = getSB();
  if (!row.created_at) row.created_at = new Date().toISOString();
  row.updated_at = new Date().toISOString();

  if (table === 'rapports') {
    if (row.sigImg !== undefined) { row.sig_img = row.sigImg; delete row.sigImg; }
    if (row.savedAt !== undefined) { row.saved_at = row.savedAt; delete row.savedAt; }
    const RAPPORT_COLS = ['id','cid','mid','tech','date','rnum','dur','tstart','tend',
      'taches','signer','sig_img','saved_at','statut','appel_id','created_at','updated_at'];
    Object.keys(row).forEach(k => {
      if (!RAPPORT_COLS.includes(k) || row[k] === undefined) delete row[k];
    });
    if (!row.date) row.date = new Date().toISOString().split('T')[0];

    // ── UPLOAD PHOTOS AVANT SAUVEGARDE ──
    if (sb && isOnline && row.taches) {
      const withURLs = await uploadRapportPhotos(row);
      row.taches = withURLs.taches;
    }
  }

  // Mise à jour cache local (photos strippées)
  const local = LS.get(table) || [];
  const idx = local.findIndex(r => r.id === row.id);
  const rowForCache = table === 'rapports'
    ? {...row, taches: row.taches ? row.taches.map(t => ({...t, photos: t.photos && Array.isArray(t.photos) ? t.photos.length : (t.photos || 0)})) : row.taches}
    : row;
  if (idx >= 0) local[idx] = rowForCache; else local.push(rowForCache);
  LS.set(table, local);

  if (!sb || !isOnline) { addPending({ type: 'upsert', table, data: row }); updateStatusBadge(); return; }
  const { error } = await sb.from(table).upsert(row);
  if (error) { addPending({ type: 'upsert', table, data: row }); console.warn('DB upsert error:', error); }
  updateStatusBadge();
}

async function dbDelete(table, id) {
  const sb = getSB();
  const local = (LS.get(table) || []).filter(r => r.id !== id);
  LS.set(table, local);
  if (!sb || !isOnline) { addPending({ type: 'delete', table, id }); updateStatusBadge(); return; }
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) { addPending({ type: 'delete', table, id }); console.warn('DB delete error:', error); }
  updateStatusBadge();
}

// ── DB object ──
const DB = {
  clients:    () => dbGet('clients'),
  machines:   () => dbGet('machines'),
  rapports:   () => dbGet('rapports'),
  rapportById: async (id) => {
    const sb = getSB();
    if (!sb) return DB.rapportsSync().find(r => r.id === id) || null;
    const { data, error } = await sb.from('rapports').select('*').eq('id', id).single();
    if (error || !data) return DB.rapportsSync().find(r => r.id === id) || null;
    if (data.sig_img !== undefined) { data.sigImg = data.sig_img; }
    if (data.saved_at !== undefined) { data.savedAt = data.saved_at; }
    return data;
  },
  appels:     () => dbGet('appels'),
  techs:      () => dbGet('techs'),

  clientsSync:  () => LS.get('clients')  || [],
  machinesSync: () => LS.get('machines') || [],
  rapportsSync: () => LS.get('rapports') || [],
  appelsSync:   () => LS.get('appels')   || [],
  techsSync:    () => LS.get('techs')    || [],

  saveClient:   row => dbUpsert('clients',  row),
  saveMachine:  row => dbUpsert('machines', row),
  saveRapport:  row => dbUpsert('rapports', row),
  saveAppel:    row => dbUpsert('appels',   row),
  saveTech:     row => dbUpsert('techs',    row),

  delClient:  id => dbDelete('clients',  id),
  delMachine: id => dbDelete('machines', id),
  delRapport: id => dbDelete('rapports', id),
  delAppel:   id => dbDelete('appels',   id),
  delTech:    id => dbDelete('techs',    id),

  clientById:        id  => (LS.get('clients')  || []).find(c => c.id === id),
  machineById:       id  => (LS.get('machines') || []).find(m => m.id === id),
  machinesForClient: cid => (LS.get('machines') || []).filter(m => m.cid === cid),
};

// ── Seed ──
async function seedIfEmpty() {
  const sb = getSB(); if (!sb) return;
  const { count } = await sb.from('clients').select('*', { count: 'exact', head: true });
  if (count > 0) { console.log(`DB already has ${count} clients`); return; }
  console.log('Seeding initial data...');
  if (window.SEED_CLIENTS && window.SEED_MACHINES) {
    const batchSize = 50;
    for (let i = 0; i < window.SEED_CLIENTS.length; i += batchSize) {
      await sb.from('clients').insert(window.SEED_CLIENTS.slice(i, i + batchSize));
    }
    for (let i = 0; i < window.SEED_MACHINES.length; i += batchSize) {
      await sb.from('machines').insert(window.SEED_MACHINES.slice(i, i + batchSize));
    }
    console.log('Seed complete');
  }
}

// ── Init ──
async function initDB() {
  const sb = getSB();
  if (sb && isOnline) {
    await seedIfEmpty();
    await Promise.all(['clients','machines','rapports','appels','techs'].map(t => dbGet(t)));
    const sbTechs = LS.get('techs') || [];
    if (sbTechs.length === 0) {
      const oldTechs = JSON.parse(localStorage.getItem('bmak_techs') || '[]');
      if (oldTechs.length > 0) {
        for (const t of oldTechs) { await dbUpsert('techs', t); }
        console.log('Migrated', oldTechs.length, 'techs to Supabase');
      }
    }
    syncPending();
  } else {
    if (!LS.get('clients') && window.SEED_CLIENTS) {
      LS.set('clients', window.SEED_CLIENTS);
      LS.set('machines', window.SEED_MACHINES);
    }
  }
  updateStatusBadge();
}

// Shared utils
function fmtDate(d) { if(!d) return '—'; const p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
function initials(nom) { return (nom||'').split(' ').map(w=>w[0]||'').filter(Boolean).slice(0,2).join('').toUpperCase(); }
function statusSty(etat) {
  if(!etat) return {bg:'#f2f2f2',color:'#6c6c70',border:'#d1d1d6'};
  if(etat.includes('Bon'))  return {bg:'#e6f9f0',color:'#1a7a4a',border:'#34c759'};
  if(etat.includes('Hors')) return {bg:'#fff0ef',color:'#c0392b',border:'#ff3b30'};
  return {bg:'#fff8ee',color:'#b44f00',border:'#ff9500'};
}
