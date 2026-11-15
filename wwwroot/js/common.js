/* =====================================================================
 * common.js : code partagé par toutes les pages
 * Chargé avant le script de chaque page : il fournit les utilitaires
 * (sélection, échappement HTML, appels API, session JWT, fenêtre modale)
 * puis protège la page et affiche la barre du haut.
 * ===================================================================== */

/* ---------- Constantes et petits utilitaires ---------- */

// Raccourci de document.querySelector (r = élément dans lequel chercher).
const $ = (s, r = document) => r.querySelector(s);

// Échappe le texte avant de l'insérer dans du HTML : protège contre l'injection (XSS).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Libellés affichés pour les valeurs de l'énumération Statut du backend.
const STATUTS = { AFaire: 'À faire', EnCours: 'En cours', Terminee: 'Terminée' };

// Lit un paramètre de l'URL (ex. ?id=3) : chaque page de détail en a besoin.
const param = k => new URLSearchParams(location.search).get(k);

// Accès au localStorage où est rangé le token.
// Les try/catch évitent une erreur si le navigateur bloque le stockage.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

/* ---------- Affichage : fragments HTML réutilisables ---------- */

// Couleur de l'icône calculée à partir du texte : un même nom garde toujours la même couleur.
function colorOf(txt) {
  let h = 0;
  for (const c of String(txt)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg,hsl(${h} 75% 62%),hsl(${(h + 40) % 360} 70% 45%))`;
}

// Initiales (2 lettres au plus) affichées dans l'icône.
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2)
  .map(w => w[0]).join('').toUpperCase();

// Icône colorée avec les initiales ; big = grande version des pages de détail.
const icon = (n, big) =>
  `<div class="icon ${big ? 'big' : ''}"
    style="background:${colorOf(n)}">${esc(initials(n))}</div>`;

// Remplace tout le contenu principal de la page (<main id="app">).
const view = html => { $('#app').innerHTML = html; };

// Blocs gris animés affichés pendant le chargement.
const skeleton = n => `<div class="grid">${'<div class="skeleton"></div>'.repeat(n)}</div>`;

// Message centré « rien à afficher » ou « erreur » (e = emoji, t = texte).
const emptyBox = (e, t) => `<div class="empty">
    <div class="big">${e}</div>
    <p>${t}</p>
  </div>`;

// Normalise pour la recherche : minuscules et sans accents ("Tâche" -> "tache").
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim();

// Barre de recherche commune à toutes les pages.
const bar = (id, ph = 'Rechercher par nom…') =>
  `<div class="search">
    <span>🔍</span>
    <input id="${id}" placeholder="${ph}" autocomplete="off">
  </div>`;

// Range les éléments par carreaux de 4 lignes (fn = rendu d'une ligne).
const carreaux = (arr, fn) => {
  let h = '';
  for (let i = 0; i < arr.length; i += 4)
    h += `<div class="tile">${arr.slice(i, i + 4).map(fn).join('')}</div>`;
  return h;
};

// Un seul carreau autour d'un contenu (sert pour les messages vides).
const tile = html => `<div class="tile">${html}</div>`;

// Barre d'avancement + « 33,3 % terminé » ; rien si v est null (avancement inconnu).
const avHtml = v => v == null ? '' : `
  <div class="bar${v >= 100 ? ' done' : ''}"><i style="width:${v}%"></i></div>
  <span class="sub">${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % terminé</span>`;

// Petit message temporaire en bas de l'écran (err = version rouge pour les erreurs).
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Demande confirmation avant une action destructive (suppression…).
const confirmDo = (msg, fn) => { if (confirm(msg)) fn(); };

/* ---------- Session (JWT) ---------- */

// Décode la partie centrale (payload) du JWT pour lire ses informations.
// Pas de vérification de signature ici : c'est le serveur qui s'en charge.
function parseJwt(t) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(
      t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    ))));
  } catch {
    return null;
  }
}

// Utilisateur connecté (token, nom, rôles, admin) ou null si pas de token valide.
// Un token expiré est supprimé pour forcer une nouvelle connexion.
function session() {
  const t = store.get('token');
  if (!t) return null;
  const p = parseJwt(t);
  if (!p) return null;
  if (p.exp && p.exp * 1000 < Date.now()) { store.del('token'); return null; }
  // ASP.NET écrit les rôles et le nom sous de longues clés « claims » :
  // on accepte aussi les clés courtes.
  let roles = p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? p.role ?? [];
  if (!Array.isArray(roles)) roles = [roles];
  const name = p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    ?? p.name ?? p.unique_name ?? p.email ?? '';
  return { token: t, name, roles, admin: roles.includes('Admin') };
}

/* ---------- Appels à l'API ---------- */

// Point d'entrée unique vers le backend : toutes les pages passent par ici.
// path = URL de l'API, method = verbe HTTP, body = objet envoyé en JSON (facultatif).
async function api(path, method = 'GET', body) {
  // 1. Lecture du token : session() le lit dans localStorage (clé 'token')
  //    et renvoie null s'il est absent ou expiré.
  const s = session();

  // 2. En-têtes envoyés :
  //    - Content-Type: application/json seulement s'il y a un corps à envoyer ;
  //    - Authorization: Bearer <token> si l'utilisateur est connecté,
  //      c'est ce que lit l'authentification JWT d'ASP.NET Core.
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (s) headers['Authorization'] = 'Bearer ' + s.token;

  // 3. Envoi de la requête ; le corps est converti en texte JSON.
  //    Une erreur réseau (serveur arrêté) donne un message clair.
  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('API injoignable. Le serveur est-il lancé ?');
  }

  // 4. Codes d'accès refusé :
  //    - 401 : pas connecté ou token invalide -> on efface le token
  //            et on renvoie vers la page de connexion ;
  //    - 403 : connecté mais rôle insuffisant (action réservée à l'Admin).
  if (res.status === 401) {
    store.del('token');
    location.href = 'login.html';
    throw new Error('Connexion requise');
  }
  if (res.status === 403) throw new Error('Action réservée aux administrateurs');

  // 5. Lecture de la réponse : on lit le texte puis on tente le JSON
  //    (une réponse vide donne null, un texte simple reste du texte).
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }

  // 6. Réponse en erreur (400, 404, 500…) : on construit un message lisible
  //    à partir du texte, du « title » ASP.NET, des erreurs de validation
  //    ou de la liste d'erreurs d'Identity, puis on lève une exception.
  if (!res.ok) {
    let m = typeof data === 'string' && data ? data : (data?.title || 'Erreur ' + res.status);
    if (data?.errors) m = Object.values(data.errors).flat().join(' · ');
    if (Array.isArray(data)) m = data.map(x => x.description ?? x.Description ?? x).join('.');
    throw new Error(m);
  }

  // 7. Succès : on renvoie les données déjà converties.
  return data;
}

// Les listes de l'API sont soit un tableau, soit un objet paginé { items, total } :
// list() renvoie toujours le tableau, total() le nombre total d'éléments.
const list = d => Array.isArray(d) ? d : (d?.items ?? []);
const total = d => Array.isArray(d) ? d.length
  : (d?.total ?? d?.totalCount ?? (d?.items?.length ?? 0));

// Charge tous les éléments d'un endpoint paginé, page par page (50 au plus par page).
// url = chemin sans page ni pageSize, ex. '/api/Membres' ou '/api/projets/3/taches'.
async function toutes(url) {
  const res = [];
  for (let p = 1; ; p++) {
    const d = await api(`${url}${url.includes('?') ? '&' : '?'}page=${p}&pageSize=50`);
    res.push(...list(d));
    if (!list(d).length || res.length >= total(d)) return res;
  }
}

// Extrait le pourcentage d'avancement, que l'API renvoie un nombre ou un objet.
// Dans un objet, on préfère une clé qui ressemble à « pourcentage / avancement ».
function pct(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v))
      if (typeof v[k] === 'number' && /pour|avanc|percent|taux/i.test(k)) return v[k];
    for (const k of Object.keys(v))
      if (typeof v[k] === 'number') return v[k];
  }
  return 0;
}

/* ---------- Fenêtre de formulaire (modale) ---------- */

// Ouvre un formulaire générique décrit par fields ; onOk reçoit les valeurs saisies.
// La fenêtre ne se ferme que si onOk réussit, sinon l'erreur s'affiche en toast.
function modal(title, fields, onOk, okLabel = 'Enregistrer') {
  const m = document.createElement('div');
  m.className = 'modal';
  // Un champ par entrée de fields : textarea, select ou input selon f.type.
  m.innerHTML = `<form class="box">
    <h3>${esc(title)}</h3>
    ${fields.map(f => `
      <label>${esc(f.label)}</label>
      ${f.type === 'textarea'
        ? `<textarea name="${f.name}" rows="3">${esc(f.value || '')}</textarea>`
        : f.type === 'select'
          ? `<select name="${f.name}" ${f.required ? 'required' : ''}>
              ${(f.options || []).map(o => `<option value="${esc(o.value)}"
                ${String(o.value) === String(f.value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
            </select>`
          : `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value || '')}"
              ${f.required ? 'required' : ''}>`}`).join('')}
    <div class="foot">
      <button type="button" class="btn" data-x>Annuler</button>
      <button class="btn primary">${esc(okLabel)}</button>
    </div>
  </form>`;
  document.body.appendChild(m);

  // Fermeture : clic sur le fond gris ou sur « Annuler » (attribut data-x).
  const close = () => m.remove();
  m.addEventListener('click', e => {
    if (e.target === m || e.target.hasAttribute('data-x')) close();
  });

  // Validation : on récupère les champs sous forme d'objet { name: valeur }.
  m.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try { await onOk(data); close(); } catch (err) { toast(err.message, true); }
  });

  const f = m.querySelector('input,textarea');
  if (f) f.focus();
}

/* ---------- Barre du haut + protection des pages ---------- */

// Affiche le menu (lien actif surligné, « Rôles » réservé à l'Admin)
// et la zone utilisateur (rôles, déconnexion) ou un bouton de connexion.
function renderTop(active) {
  const s = session();
  const link = (href, txt, key) =>
    `<a href="${href}" class="${active === key ? 'on' : ''}">${txt}</a>`;
  $('#nav').innerHTML = link('projets.html', 'Projets', 'projets') +
    link('membres.html', 'Membres', 'membres') +
    (s?.admin ? link('roles.html', 'Rôles', 'roles')
      + link('commentaires.html', 'Commentaires', 'commentaires') : '');
  $('#user').innerHTML = s
    ? `<span class="badge ${s.admin ? 'admin' : ''}">${esc(s.roles.join(' & ') || 'Aucun Role')}</span>
      <button class="btn small" id="logout">Déconnexion</button>
      <span class="mail">${esc(s.name)}</span>`
    : `<a class="btn primary small" href="login.html">Connexion</a>`;
  // Déconnexion : il suffit d'oublier le token (le JWT n'est pas stocké côté serveur).
  const lo = $('#logout');
  if (lo) lo.onclick = () => { store.del('token'); location.href = 'login.html'; };
}

/* ---------- Initialisation (exécutée au chargement de chaque page) ---------- */

// <body data-page="…"> indique la page courante ; hors connexion, une page
// sans session valide renvoie vers login.html.
const PAGE = document.body.dataset.page;
if (PAGE !== 'login' && !session()) location.replace('login.html');
renderTop(PAGE);
