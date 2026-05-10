// ── B-Mak ServicePro — db.js ── v12
// Supabase cloud DB with localStorage offline fallback

// ┌─────────────────────────────────────────────┐
// │  REPLACE THESE TWO VALUES AFTER SETUP       │
// └─────────────────────────────────────────────┘
const SUPABASE_URL = 'https://rkvqnuljitffyiczbqky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdnFudWxqaXRmZnlpY3picWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTExMDYsImV4cCI6MjA5MzY4NzEwNn0.-6Taz1hg9n_TnrG7sgT4k_KqpJGtPFDEh6tsaTWU5r0';

// ── Supabase client (loaded via CDN in HTML) ──
var _sbClient = null;
function getSB() {
  if (!_sbClient && window.supabase && SUPABASE_URL !== 'PLACEHOLDER') {
    // Auto-clean URL: remove trailing /rest/v1/ or slashes if accidentally included
    var cleanURL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    _sbClient = window.supabase.createClient(cleanURL, SUPABASE_KEY);
  }
  return _sbClient;
}

// ── Online/offline detection ──
let isOnline = navigator.onLine;
window.addEventListener('online',  () => { isOnline = true;  syncPending(); });
window.addEventListener('offline', () => { isOnline = false; });

// ── LocalStorage helpers (cache + offline queue) ──
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem('bmak_' + k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem('bmak_' + k, JSON.stringify(v)); } catch(e) { console.warn('LS full', e); } },
};

// ── Pending sync queue (operations done offline) ──
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

// ── Generic CRUD ──
async function dbGet(table) {
  const sb = getSB();
  if (!sb || !isOnline) return LS.get(table) || [];
  // Always paginate with range() — limit() is capped at 1000 by Supabase server
  let allData = [], from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999);
    if (error) { console.warn('dbGet error:', table, error); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < 1000) break; // last page — fewer than 1000 rows returned
    from += 1000;
  }
  // Normalize field names back from Supabase schema
  if (table === 'rapports') {
    allData = allData.map(r => {
      if (r.sig_img !== undefined) { r.sigImg = r.sig_img; }
      if (r.saved_at !== undefined) { r.savedAt = r.saved_at; }
      return r;
    });
  }
  // Strip photos from LS cache to avoid quota errors (photos stay in Supabase)
  const cacheData = table === 'rapports'
    ? allData.map(r => ({...r, taches: r.taches ? r.taches.map(t => ({...t, photos: t.photos && t.photos.length ? t.photos.length : 0})) : r.taches}))
    : allData;
  LS.set(table, cacheData);
  return allData; // Return full data WITH photos
}

async function dbUpsert(table, row) {
  const sb = getSB();
  if (!row.created_at) row.created_at = new Date().toISOString();
  row.updated_at = new Date().toISOString();
  // Normalize field names for Supabase schema
  if (table === 'rapports') {
    if (row.sigImg !== undefined) { row.sig_img = row.sigImg; delete row.sigImg; }
    if (row.savedAt !== undefined) { row.saved_at = row.savedAt; delete row.savedAt; }
    // Keep only columns that exist in Supabase schema
    const RAPPORT_COLS = ['id','cid','mid','tech','date','rnum','dur','tstart','tend',
      'taches','signer','sig_img','saved_at','statut','appel_id','created_at','updated_at'];
    Object.keys(row).forEach(k => {
      if (!RAPPORT_COLS.includes(k) || row[k] === undefined) delete row[k];
    });
    // date is required - use today if missing
    if (!row.date) row.date = new Date().toISOString().split('T')[0];
  }
  // Remove fields that don't exist in Supabase schema
  if (table === 'appels') {
    delete row.rapport_id; // Not in schema yet — remove to avoid 400
  }
  // Update local cache immediately (strip photos from rapports to avoid LS quota)
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
  // Update local cache immediately
  const local = (LS.get(table) || []).filter(r => r.id !== id);
  LS.set(table, local);
  if (!sb || !isOnline) { addPending({ type: 'delete', table, id }); updateStatusBadge(); return; }
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) { addPending({ type: 'delete', table, id }); console.warn('DB delete error:', error); }
  updateStatusBadge();
}

// ── DB object — same API as before but async ──
const DB = {
  // Read (returns promise)
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

  // Sync reads from cache (for places that need immediate values)
  clientsSync:  () => LS.get('clients')  || [],
  machinesSync: () => LS.get('machines') || [],
  rapportsSync: () => LS.get('rapports') || [],
  appelsSync:   () => LS.get('appels')   || [],
  techsSync:    () => LS.get('techs')    || [],

  // Write
  saveClient:   row => dbUpsert('clients',  row),
  saveMachine:  row => dbUpsert('machines', row),
  saveRapport:  row => dbUpsert('rapports', row),
  saveAppel:    row => dbUpsert('appels',   row),
  saveTech:     row => dbUpsert('techs',    row),

  // Delete
  delClient:  id => dbDelete('clients',  id),
  delMachine: id => dbDelete('machines', id),
  delRapport: id => dbDelete('rapports', id),
  delAppel:   id => dbDelete('appels',   id),
  delTech:    id => dbDelete('techs',    id),

  // Helpers (sync, from cache)
  clientById:        id  => (LS.get('clients')  || []).find(c => c.id === id),
  machineById:       id  => (LS.get('machines') || []).find(m => m.id === id),
  machinesForClient: cid => (LS.get('machines') || []).filter(m => m.cid === cid),
};

// ── Seed initial data if tables are empty ──
async function seedIfEmpty() {
  const sb = getSB(); if (!sb) return;
  const { count } = await sb.from('clients').select('*', { count: 'exact', head: true });
  if (count > 0) { console.log(`DB already has ${count} clients`); return; }
  console.log('Seeding initial data...');
  // Import seed from separate file to keep db.js small
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
    // Load all tables into cache
    await Promise.all(['clients','machines','rapports','appels','techs'].map(t => dbGet(t)));
    // Sync techs from localStorage to Supabase if Supabase has none
    const sbTechs = LS.get('techs') || [];
    if (sbTechs.length === 0) {
      // Check if there were techs saved in old localStorage key
      const oldTechs = JSON.parse(localStorage.getItem('bmak_techs') || '[]');
      if (oldTechs.length > 0) {
        for (const t of oldTechs) { await dbUpsert('techs', t); }
        console.log('Migrated', oldTechs.length, 'techs to Supabase');
      }
    }
    syncPending();
  } else {
    // Offline: bootstrap from seed if cache is empty
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
