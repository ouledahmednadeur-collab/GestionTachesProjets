/* ===== Code partagé par toutes les pages ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUTS = { AFaire: 'À faire', EnCours: 'En cours', Terminee: 'Terminée' };
const param = k => new URLSearchParams(location.search).get(k);

/* stockage du token (try/catch car le navigateur peut le bloquer) */
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch {} },
  del(k){ try { localStorage.removeItem(k); } catch {} }
};

/* ---------- affichage ---------- */
function colorOf(txt){ let h = 0; for (const c of String(txt)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg,hsl(${h} 75% 62%),hsl(${(h + 40) % 360} 70% 45%))`; }
const initials = n => String(n || '?').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
const icon = (n, big) => `<div class="icon ${big ? 'big' : ''}" style="background:${colorOf(n)}">${esc(initials(n))}</div>`;
const view = html => { $('#app').innerHTML = html; };
const skeleton = n => `<div class="grid">${'<div class="skeleton"></div>'.repeat(n)}</div>`;
const emptyBox = (e, t) => `<div class="empty"><div class="big">${e}</div><p>${t}</p></div>`;
/* recherche : minuscules + sans accents ("Tâche" -> "tache") et barre de recherche commune */
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const bar = (id, ph = 'Rechercher par nom…') => `<div class="search"><span>🔍</span><input id="${id}" placeholder="${ph}" autocomplete="off"></div>`;
/* carreaux de 4 lignes */
const carreaux = (arr, fn) => {
  let h = '';
  for (let i = 0; i < arr.length; i += 4)
    h += `<div class="tile">${arr.slice(i, i + 4).map(fn).join('')}</div>`;
  return h;
};
const tile = html => `<div class="tile">${html}</div>`;
/* barre d'avancement + « 33,3 % terminé » (rien si v est null) */
const avHtml = v => v == null ? '' : `<div class="bar${v >= 100 ? ' done' : ''}"><i style="width:${v}%"></i></div>
  <span class="sub">${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % terminé</span>`;
function toast(msg, err){ const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
const confirmDo = (msg, fn) => { if (confirm(msg)) fn(); };

/* ---------- session (JWT) ---------- */
function parseJwt(t){ try { return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))))); } catch { return null; } }
function session(){
  const t = store.get('token'); if (!t) return null;
  const p = parseJwt(t); if (!p) return null;
  if (p.exp && p.exp * 1000 < Date.now()) { store.del('token'); return null; }
  let roles = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? p.role ?? [];
  if (!Array.isArray(roles)) roles = [roles];
  const name = p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? p.name ?? p.unique_name ?? p.email ?? '';
  return { token: t, name, roles, admin: roles.includes('Admin') };
}

/* ---------- appels à l'API ---------- */
async function api(path, method = 'GET', body){
  const s = session();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (s) headers['Authorization'] = 'Bearer ' + s.token;
  let res;
  try { res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch { throw new Error('API injoignable. Le serveur est-il lancé ?'); }
  if (res.status === 401) { store.del('token'); location.href = 'login.html'; throw new Error('Connexion requise'); }
  if (res.status === 403) throw new Error('Action réservée aux administrateurs');
  const txt = await res.text(); let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!res.ok) {
    let m = typeof data === 'string' && data ? data : (data?.title || 'Erreur ' + res.status);
    if (data?.errors) m = Object.values(data.errors).flat().join(' · ');
    if (Array.isArray(data)) m = data.map(x => x.description??x.Description?? x).join('.');
    throw new Error(m);
  }
  return data;
}
const list = d => Array.isArray(d) ? d : (d?.items ?? []);
const total = d => Array.isArray(d) ? d.length : (d?.total ?? d?.totalCount ?? (d?.items?.length ?? 0));
function pct(v){ if (typeof v === 'number') return v;
  if (v && typeof v === 'object'){ for (const k of Object.keys(v)) if (typeof v[k] === 'number' && /pour|avanc|percent|taux/i.test(k)) return v[k];
    for (const k of Object.keys(v)) if (typeof v[k] === 'number') return v[k]; }
  return 0; }

/* ---------- fenêtre de formulaire ---------- */
function modal(title, fields, onOk, okLabel = 'Enregistrer'){
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="box"><h3>${esc(title)}</h3>${fields.map(f => `
    <label>${esc(f.label)}</label>
    ${f.type === 'textarea' ? `<textarea name="${f.name}" rows="3">${esc(f.value || '')}</textarea>`
      : f.type === 'select' ? `<select name="${f.name}" ${f.required ? 'required' : ''}>${(f.options || []).map(o =>
          `<option value="${esc(o.value)}" ${String(o.value) === String(f.value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`
      : `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value || '')}" ${f.required ? 'required' : ''}>`}`).join('')}
    <div class="foot"><button type="button" class="btn" data-x>Annuler</button><button class="btn primary">${esc(okLabel)}</button></div></form>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-x')) close(); });
  m.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.target));
    try { await onOk(data); close(); } catch (err) { toast(err.message, true); }
  });
  const f = m.querySelector('input,textarea'); if (f) f.focus();
}

/* ---------- barre du haut + protection des pages ---------- */
function renderTop(active){
  const s = session();
  const link = (href, txt, key) => `<a href="${href}" class="${active === key ? 'on' : ''}">${txt}</a>`;
  $('#nav').innerHTML = link('index.html', 'Projets', 'projets') + link('membres.html', 'Membres', 'membres') +
    (s?.admin ? link('roles.html', 'Rôles', 'roles') : '');
  $('#user').innerHTML = s
    ? `<span class="badge ${s.admin ? 'admin' : ''}">${esc(s.roles.join(' & ') || 'Aucun Role')}</span><button class="btn small" id="logout">Déconnexion</button><span class="mail">${esc(s.name)}</span>`
    : `<a class="btn primary small" href="login.html">Connexion</a>`;
  const lo = $('#logout'); if (lo) lo.onclick = () => { store.del('token'); location.href = 'login.html'; };
}
const PAGE = document.body.dataset.page;
if (PAGE !== 'login' && !session()) location.replace('login.html');
renderTop(PAGE);
