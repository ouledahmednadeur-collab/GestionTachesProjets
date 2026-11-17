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

/* ---------- Profil d'un membre : adresse et liens ---------- */

// Adresse de la page profil d'un membre (seul endroit où elle est écrite).
const memberUrl = id => `membre.html?id=${id}`;

// Rend html (nom et/ou avatar) cliquable vers le profil du membre id.
// - hors d'une carte cliquable : un vrai lien <a> ;
// - dans une carte déjà cliquable (<a class="card">), dansCarte = true : un lien ne peut pas
//   être imbriqué dans un lien, on pose donc data-profil sur un <span>, géré plus bas.
// Sans id (membre inconnu) : html inchangé.
const memberLink = (id, html, dansCarte = false) => id == null ? html
  : dansCarte
    ? `<span class="profil-lien" data-profil="${id}" role="link" tabindex="0">${html}</span>`
    : `<a class="profil-lien" href="${memberUrl(id)}">${html}</a>`;

// Clic (ou Entrée) sur un [data-profil] : ouvre le profil au lieu de suivre la carte qui
// le contient. Écouté une fois pour toute la page, en phase de capture, avant la carte.
['click', 'keydown'].forEach(type => document.addEventListener(type, e => {
  const el = e.target.closest?.('[data-profil]');
  if (!el || (type === 'keydown' && e.key !== 'Enter')) return;
  e.preventDefault();      // la carte (lien vers la tâche) n'est pas suivie
  e.stopPropagation();
  location.href = memberUrl(el.dataset.profil);
}, true));

// Petit engrenage (forme du logo) dont la vitesse suit le statut d'une tâche :
// arrêté si Terminée, lent si À faire, rapide si En cours (classes gear--… dans style.css).
const gearStatut = statut => `<svg class="gear-mini gear--${String(statut).toLowerCase()}"
    viewBox="-30 -30 60 60" aria-hidden="true"><path fill-rule="evenodd" d="${gearPath(12, 4, 7)}"/></svg>`;

// Membre affiché avec son avatar (même icon() que partout, en petit via .membre),
// son nom, puis un badge de rôle si on le connaît ('Admin' -> « Administrateur »).
// apres = petit contenu ajouté à côté du nom (date d'un commentaire, badge « Vous »…).
// id (facultatif) = membre : avatar et nom deviennent un lien vers son profil.
// Sans nom : pastille grise « ? » et « Non assignée ».
// Commentaire écrit par un Admin : badge « Admin » (même style que celui de la barre du haut).
const badgeAdminCom = c => c?.estAdmin ? ' <span class="role-pill admin">Admin</span>' : '';
// Nom de l'auteur d'un commentaire : celui renvoyé par l'API pour un Admin, sinon le nom du
// membre trouvé par son id (nomDuMembre = fonction id -> nom).
const auteurCom = (c, nomDuMembre) => c.estAdmin ? (c.auteurNom || 'Administrateur')
  : nomDuMembre(c.membreId) || 'Membre ' + c.membreId;

function renderMembre(nom, role, apres = '', id = null) {
  if (!nom) return `<div class="membre">
      <div class="icon vide">?</div>
      <span class="sub">Non assignée</span>
    </div>`;
  return `<div class="membre">
      ${memberLink(id, icon(nom))}
      <div>
        <b>${memberLink(id, esc(nom))}</b>${apres}
        ${role ? `<div><span class="badge ${role === 'Admin' ? 'admin' : ''}">${
          esc(role === 'Admin' ? 'Administrateur' : role)}</span></div>` : ''}
      </div>
    </div>`;
}

/* ---------- Logo : engrenage + membre d'équipe casqué (SVG dessiné ici) ---------- */

// Contour d'un engrenage centré en (0,0) : n dents, module m (taille des dents),
// trou central de rayon trou (0 = plein), phase = angle de la première dent (radians).
// Deux engrenages de même module s'engrènent si la distance entre centres = (n1 + n2) * m / 2.
function gearPath(n, m, trou = 0, phase = 0) {
  const r = n * m / 2, ra = r + 0.8 * m, rf = r - 1.1 * m;   // rayons primitif, de tête, de pied
  const s = 0.38 * Math.PI * m / 2;                          // demi-épaisseur au primitif (dents fines : aucun contact)
  const t = Math.tan(20 * Math.PI / 180);                    // inclinaison des flancs
  const demi = rho => (s - (rho - r) * t) / rho;             // demi-largeur angulaire à un rayon
  const hf = demi(rf), ha = demi(ra), pas = 2 * Math.PI / n;
  const pt = (rho, a) => `${(rho * Math.cos(a)).toFixed(2)} ${(rho * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let k = 0; k < n; k++) {
    const c = phase + k * pas;                               // axe de la dent k
    d += (k ? ` A${rf} ${rf} 0 0 1 ` : 'M') + pt(rf, c - hf)
      + ` L${pt(ra, c - ha)} A${ra} ${ra} 0 0 1 ${pt(ra, c + ha)} L${pt(rf, c + hf)}`;
  }
  d += ` A${rf} ${rf} 0 0 1 ${pt(rf, phase - hf)}Z`;
  if (trou) d += ` M${trou} 0A${trou} ${trou} 0 1 0 ${-trou} 0A${trou} ${trou} 0 1 0 ${trou} 0Z`;
  return d;
}

// Logo : grand engrenage (20 dents) avec, au centre, un membre d'équipe casqué.
// anime = false : logo fixe seul (barre du haut) ;
// anime = true  : + 2 petits engrenages entraînés (page de connexion), seul l'anneau tourne.
function gearLogo(anime = false) {
  const N = 20, M = 5, D = 16;   // dents, module et durée d'un tour (s) du grand engrenage
  // Rotation CSS : base continue + couche « accélération » active au survol (sens = cw | ccw).
  const tourne = (n, sens, contenu) => `<g class="gl-spin ${sens}" style="--d:${D * n / N}s">
      <g class="gl-boost ${sens}" style="--d:${2 * D * n / N}s">${contenu}</g>
    </g>`;
  const anneau = `<path class="gl-ring" fill-rule="evenodd" d="${gearPath(N, M, 37)}"/>`;
  // Silhouette fixe : disque de fond, épaules, tête, casque (dôme, visière, arête).
  const perso = `<circle class="gl-fond" r="37"/>
    <path class="gl-corps" d="M-28.5 22C-26 10-16 7 0 7S26 10 28.5 22A36 36 0 0 1-28.5 22Z"/>
    <circle class="gl-corps" cy="-6" r="10.5"/>
    <path class="gl-casque" d="M-12.5-8A12.5 12.5 0 0 1 12.5-8Z"/>
    <rect class="gl-casque" x="-16" y="-9.5" width="32" height="3.5" rx="1.75"/>
    <path class="gl-arete" d="M0-19V-10"/>`;
  if (!anime)
    return `<svg class="gear-logo" viewBox="-56 -56 112 112" aria-hidden="true">${anneau}${perso}</svg>`;

  // Petits engrenages : n dents, direction a (degrés) depuis le centre du grand.
  // Leur phase place un creux face à chaque dent du grand pour qu'ils s'emboîtent.
  const petits = [{ n: 10, a: 150 }, { n: 12, a: -40 }].map(({ n, a }) => {
    const al = a * Math.PI / 180, dist = (N + n) * M / 2;
    const p1 = 2 * Math.PI / N, p2 = 2 * Math.PI / n;
    const x = (((0 - al) / p1) % 1 + 1) % 1;                   // position de al entre deux dents du grand
    const phase = al + Math.PI - x * p2 + p2 / 2;
    return `<g transform="translate(${(dist * Math.cos(al)).toFixed(2)} ${(dist * Math.sin(al)).toFixed(2)})">
        ${tourne(n, 'ccw', `<path class="gl-petit" fill-rule="evenodd" d="${gearPath(n, M, n * M * 0.15, phase)}"/>`)}
      </g>`;
  }).join('');
  return `<svg class="gear-anim" viewBox="-98 -88 196 158" aria-hidden="true">
      ${petits}${tourne(N, 'cw', anneau)}${perso}
    </svg>`;
}

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

// Taille de page commune à toutes les listes paginées du front (tâches, projets, commentaires,
// notifications, conversations, membres…). Les chargements complets (pageSize=50) n'en dépendent pas.
const PAGE_SIZE = 10;

// Pagination côté front, même rendu que les autres pages (.pager, Précédent / Page x / y / Suivant).
// arr = toute la liste, taille = éléments par page, page = page voulue (ramenée dans les bornes).
// Renvoie { page, items, html } ; html est vide s'il n'y a qu'une page. Plusieurs listes
// pouvant être paginées sur une même page, les boutons portent data-pg (et non des ids).
function paginer(arr, taille, page) {
  const pages = Math.max(1, Math.ceil(arr.length / taille));
  page = Math.min(Math.max(1, page || 1), pages);
  return {
    page,
    items: arr.slice((page - 1) * taille, page * taille),
    html: pages > 1 ? `<div class="pager">
        <button class="btn" data-pg="-1" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
        <span>Page ${page} / ${pages}</span>
        <button class="btn" data-pg="1" ${page >= pages ? 'disabled' : ''}>Suivant →</button>
      </div>` : ''
  };
}

// Branche les boutons de pagination contenus dans zone : aller(+1) ou aller(-1).
const brancherPager = (zone, aller) => zone?.querySelectorAll('[data-pg]')
  .forEach(b => b.onclick = e => { e.preventDefault(); aller(+b.dataset.pg); });

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
  //    L'erreur garde son code (err.status) pour qu'une page puisse afficher un message adapté.
  if (res.status === 403) throw Object.assign(new Error('Action réservée aux administrateurs'), { status: 403 });

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

/* ---------- Mes rôles et privilèges par projet (GET /api/Auth/privileges) ---------- */

// Chargés UNE seule fois par page (la promesse est gardée en cache) et partagés par la barre du
// haut et la page. Simple confort d'affichage : le serveur revérifie chaque action (403 sinon).
// Admin : { admin: true, privileges } ; membre : { admin: false, projets: { "<id>": { projetNom,
// roles, privileges: [{ cle, libelle, description }] } } }.
// En cas d'échec de l'appel : « aucun droit », donc les boutons sensibles restent masqués.
let droitsPromesse = null;
let droitsCharges = null;   // droits une fois chargés (null tant que l'appel n'est pas terminé)
function mesDroits() {
  if (!droitsPromesse) droitsPromesse = api('/api/Auth/privileges')
    .catch(() => ({ admin: false, projets: {} }))
    .then(d => (droitsCharges = d));
  return droitsPromesse;
}
// peut(projetId, cle) : vrai si Admin, ou si ce projet contient cette clé dans ses privilèges.
// À utiliser après « await mesDroits() » ; faux tant que les droits ne sont pas chargés.
const peut = (projetId, cle) => aPrivilege(droitsCharges, cle, projetId);
// Rôles et privilèges du connecté dans un projet (vides s'il n'y a aucun rôle).
const droitsProjet = (d, projetId) => d?.projets?.[projetId] || { roles: [], privileges: [] };
// Vrai si le connecté a ce privilège DANS ce projet (Admin : partout).
const aPrivilege = (d, cle, projetId) => !!d?.admin
  || droitsProjet(d, projetId).privileges.some(p => p.cle === cle);
// Texte de survol : un privilège par ligne, avec sa description.
const survolPrivileges = privs => privs.length
  ? privs.map(p => `${p.libelle} : ${p.description}`).join('\n') : 'Aucun privilège spécial';

// Bloc « mon rôle dans ce projet » : pastilles des rôles (privilèges listés au survol) puis
// libellés des privilèges (description au survol). Admin : une seule mention.
function htmlDroitsProjet(d, projetId) {
  if (d?.admin) return '<span class="role-pill admin">Administrateur : tous les privilèges sur tous les projets</span>';
  const p = droitsProjet(d, projetId);
  if (!p.roles.length) return '<span class="sub">Membre du projet : aucun privilège spécial</span>';
  return p.roles.map(r => `<span class="role-pill metier" title="${esc(survolPrivileges(p.privileges))}">${esc(r)}</span>`).join('')
    + p.privileges.map(x => `<span class="priv-libelle" title="${esc(x.description)}">${esc(x.libelle)}</span>`).join('');
}

// Panneau « Mes privilèges » (même fenêtre que modal()) : par projet, son nom, mes rôles et la
// liste des privilèges (libellé + description). projetId fourni : ce projet seulement.
// Admin : « Accès complet ». Données lues dans l'API (mesDroits()), jamais écrites en dur.
// Fermeture : clic à l'extérieur, bouton « Fermer » ou touche Échap.
async function panneauPrivileges(projetId) {
  const d = await mesDroits();
  const pastilleRole = r => `<span class="role-pill metier">${esc(r)}</span>`;
  let corps;
  if (d.admin) {
    corps = '<p><span class="role-pill admin">Accès complet</span> Tous les privilèges sur tous les projets.</p>';
  } else {
    const entrees = Object.entries(d.projets || {})
      .filter(([id]) => projetId == null || +id === +projetId);
    corps = entrees.map(([id, p]) => `<div class="droits-projet">
        <a href="projet.html?id=${id}">${esc(p.projetNom)}</a>
        <div class="mes-droits">${p.roles.map(pastilleRole).join('')}</div>
        <ul class="privs-liste">${p.privileges.map(x => `<li><b>${esc(x.libelle)}</b>
          <span class="sub">${esc(x.description)}</span></li>`).join('') || '<li class="sub">Aucun privilège</li>'}</ul>
      </div>`).join('')
      || `<p class="sub">${projetId != null ? 'Aucun privilège dans ce projet.' : 'Aucun rôle attribué dans un projet.'}</p>`;
    // vue complète : rappel des rôles globaux du compte (« Membre » = rôle par défaut)
    if (projetId == null)
      corps += `<div class="droits-projet"><b>Rôles globaux</b>
        ${(session()?.roles || []).map(r => `<div class="mes-droits">${pastilleRole(r)}
          <span class="sub">${r === 'Membre' ? 'Aucun privilège particulier'
            : 'Privilèges seulement dans les projets où ce rôle est attribué'}</span></div>`).join('')}</div>`;
  }
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box panneau-privs" role="dialog" aria-label="Mes privilèges">
      <h3>Mes privilèges${projetId != null ? ' dans ce projet' : ''}</h3>
      ${corps}
      <div class="foot"><button type="button" class="btn" data-x>Fermer</button></div>
    </div>`;
  document.body.appendChild(m);
  const fermer = () => { m.remove(); document.removeEventListener('keydown', echap); };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);
  m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-x')) fermer(); });
  m.querySelector('[data-x]').focus();
}

// Barre du haut : une pastille par projet où le membre a un rôle, « superviseur · Trojan RAT »
// (nom de projet raccourci, titre complet au survol) ; au-delà de 2 projets, une pastille « +N »
// ouvre un petit panneau avec la liste complète.
function rolesProjetsBarre(d) {
  const zone = $('.user-roles');
  const entrees = Object.entries(d?.projets || {});
  if (!zone || !entrees.length) return;
  const court = t => t.length > 16 ? t.slice(0, 15) + '…' : t;
  const pastilleProjet = ([id, p], complet) => `<button type="button" class="role-pill metier role-projet"
      title="${esc(p.roles.join(', ') + ' · ' + p.projetNom + '\n' + survolPrivileges(p.privileges))}">${esc(p.roles.join(', '))} · ${esc(complet ? p.projetNom : court(p.projetNom || ''))}</button>`;
  zone.insertAdjacentHTML('beforeend', entrees.slice(0, 2).map(e => pastilleProjet(e)).join('')
    + (entrees.length > 2 ? `<span class="roles-plus-zone">
        <button type="button" class="role-pill membre roles-plus" aria-expanded="false">+${entrees.length - 2}</button>
        <div class="roles-plus-panel" hidden><b>Mes rôles par projet</b>${entrees.map(e => pastilleProjet(e, true)).join('')}</div>
      </span>` : ''));
  const bouton = zone.querySelector('.roles-plus'), panneau = zone.querySelector('.roles-plus-panel');
  if (bouton) {
    bouton.onclick = e => {
      e.stopPropagation();
      panneau.hidden = !panneau.hidden;
      bouton.setAttribute('aria-expanded', String(!panneau.hidden));
    };
    document.addEventListener('click', e => {
      if (!e.target.closest('.roles-plus-zone')) { panneau.hidden = true; bouton.setAttribute('aria-expanded', 'false'); }
    });
  }
  ajusterNav();   // la zone utilisateur s'est élargie : les liens en trop passent dans « Plus »
}

// Fenêtre ouverte par modal() : ajoute au champ mot de passe un bouton « Afficher / Masquer »
// et une phrase d'aide dessous. Le mot de passe n'est jamais écrit ailleurs (ni console, ni stockage).
function brancherMotDePasse(aide) {
  const champ = [...document.querySelectorAll('.modal input[type=password]')].pop();
  if (!champ) return;
  const zone = document.createElement('div');
  zone.className = 'mdp-zone';
  champ.replaceWith(zone);
  zone.append(champ);
  zone.insertAdjacentHTML('beforeend', '<button type="button" class="btn small" aria-label="Afficher le mot de passe">Afficher</button>');
  zone.insertAdjacentHTML('afterend', `<p class="sub mdp-aide">${esc(aide)}</p>`);
  const bouton = zone.querySelector('button');
  bouton.onclick = () => {
    const visible = champ.type === 'password';
    champ.type = visible ? 'text' : 'password';
    bouton.textContent = visible ? 'Masquer' : 'Afficher';
    bouton.setAttribute('aria-label', (visible ? 'Masquer' : 'Afficher') + ' le mot de passe');
  };
}

/* ---------- Barre du haut + protection des pages ---------- */

// Affiche le menu (lien actif surligné, « Rôles » réservé à l'Admin)
// et la zone utilisateur (rôles, déconnexion) ou un bouton de connexion.
function renderTop(active) {
  const s = session();
  // Logo de la barre : l'engrenage fixe remplace l'icône carrée (même lien, même texte).
  const lg = $('.brand .logo');
  if (lg) lg.outerHTML = gearLogo();

  // Hors connexion (ou sur la page de connexion) : logo + titre seuls, menant à login.html,
  // et un bouton « S'inscrire » qui ouvre le formulaire d'inscription de la page de connexion.
  if (!s || active === 'login') {
    $('.brand').href = 'login.html';
    $('#nav').innerHTML = '';
    $('#user').innerHTML = `<button class="btn primary small" id="inscrire">S'inscrire</button>`;
    $('#inscrire').onclick = () => typeof ouvrirInscription === 'function'
      ? ouvrirInscription()                     // défini par login.js
      : location.href = 'login.html#inscription';
    ajouterEngrenageNav();   // barre réduite : l'engrenage tourne seulement lentement
    return;
  }

  const link = (href, txt, key) =>
    `<a href="${href}" class="${active === key ? 'on' : ''}">${txt}</a>`;
  $('#nav').innerHTML = link('projets.html', 'Projets', 'projets') +
    link('membres.html', 'Membres', 'membres') +
    link('taches.html', 'Tâches', 'taches') +
    (s?.admin ? link('roles.html', 'Rôles', 'roles')
      + link('commentaires.html', 'Commentaires', 'commentaires')
      + link('stats.html', 'Statistiques', 'stats')
    : link('stats.html', 'Statistiques', 'stats'));   // membre : statistiques de ses projets
  // Zone utilisateur : [avatar, email, pastilles de rôles] puis « Déconnexion » tout à droite.
  // Rôles : ceux du token (session), aucune requête. Pastille dorée pour Admin, bleue pour
  // Membre, violette pour un rôle métier. Un membre a une fiche : son avatar mène à son profil.
  // Chaque pastille est un bouton : un clic ouvre le panneau « Mes privilèges ».
  const pastille = r => `<button type="button" class="role-pill ${r === 'Admin' ? 'admin' : r === 'Membre' ? 'membre' : 'metier'}"
    title="Voir mes privilèges">${esc(r)}</button>`;
  const resume = `${s?.name || ''} · ${(s?.roles || []).join(', ') || 'Aucun rôle'}`;
  $('#user').innerHTML = s
    ? `<div class="cloche-zone">
        <button class="cloche" id="cloche" type="button" title="Notifications" aria-label="Notifications"
          aria-expanded="false">${ICONES.cloche}<span class="nav-badge" hidden></span></button>
        <div class="notif-panel" id="notifPanel" hidden></div>
      </div>
      <div class="user-bloc" title="${esc(resume)}">
        ${s.admin ? icon(s.name) : `<a class="profil-lien" href="membre.html?moi=1">${icon(s.name)}</a>`}
        <div class="user-txt">
          <span class="mail">${esc(s.name)}</span>
          <div class="user-roles">${s.roles.length ? s.roles.map(pastille).join('') : pastille('Aucun rôle')}</div>
        </div>
      </div>
      <button class="btn small" id="logout">Déconnexion</button>`
    : `<a class="btn primary small" href="login.html">Connexion</a>`;
  // Déconnexion : il suffit d'oublier le token (le JWT n'est pas stocké côté serveur).
  const lo = $('#logout');
  if (lo) lo.onclick = () => { store.del('token'); location.href = 'login.html'; };
  if (s) majMessages(active);
  if (s) initNotifications();
  // rôles par projet du membre (les rôles globaux ci-dessus sont inchangés)
  if (s && !s.admin) mesDroits().then(rolesProjetsBarre);
  // clic sur une pastille de rôle (sauf « +N ») : panneau de tous mes privilèges
  const zr = $('.user-roles');
  if (zr) zr.addEventListener('click', e => {
    const b = e.target.closest('.role-pill');
    if (b && !b.classList.contains('roles-plus')) panneauPrivileges();
  });
  ajouterEngrenageNav();
  ajusterNav();   // liens sur une ligne ; le surplus passe dans « Plus » / « Menu »
}

/* ---------- Barre du haut : liens repliés dans « Plus » / « Menu », engrenage animé ---------- */

const ICONE_MENU = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3Zm0 5h18v2H3Zm0 5h18v2H3Z"/></svg>`;
let ordreLien = 0;   // ordre d'origine des liens (le lien « Messages » arrive plus tard, à la fin)

// Remet tous les liens dans la barre (ordre d'origine), puis :
// - sous 700 px : tous les liens dans le menu « Menu » ;
// - sinon : tant que la barre déborde, le dernier lien passe dans « Plus ▾ ».
// Les liens sont déplacés (pas recopiés) : ids, classes, badges et lien actif sont conservés.
function ajusterNav() {
  const nav = $('#nav');
  if (!nav) return;
  const liens = [...nav.querySelectorAll('a')];
  if (!liens.length) return;   // barre réduite (connexion) : rien à replier
  liens.forEach(a => { if (!a.dataset.ordre) a.dataset.ordre = ++ordreLien; });
  liens.sort((a, b) => a.dataset.ordre - b.dataset.ordre);

  let plus = $('#navPlus');
  if (!plus) {
    nav.insertAdjacentHTML('beforeend', `<div class="nav-plus" id="navPlus">
        <button type="button" class="nav-plus-btn" aria-haspopup="true" aria-expanded="false"></button>
        <div class="nav-menu" hidden></div>
      </div>`);
    plus = $('#navPlus');
    brancherMenuNav(plus);
  }
  const menu = plus.querySelector('.nav-menu'), btn = plus.querySelector('.nav-plus-btn');
  fermerMenuNav();
  liens.forEach(a => nav.insertBefore(a, plus));
  nav.appendChild(plus);   // « Plus » toujours après les liens

  if (innerWidth < 700) {
    liens.forEach(a => menu.appendChild(a));
    btn.innerHTML = ICONE_MENU + 'Menu';
    plus.hidden = false;
  } else {
    btn.textContent = 'Plus ▾';
    plus.hidden = true;
    for (let i = liens.length - 1; i >= 0 && nav.scrollWidth > nav.clientWidth + 1; i--) {
      plus.hidden = false;
      menu.prepend(liens[i]);   // les moins prioritaires (fin de la liste) partent d'abord
    }
  }
  btn.classList.toggle('on', !!menu.querySelector('a.on'));   // lien actif replié : bouton en évidence
}

function fermerMenuNav() {
  const m = $('#navPlus .nav-menu');
  if (m) m.hidden = true;
  $('#navPlus .nav-plus-btn')?.setAttribute('aria-expanded', 'false');
}

// Ouverture du menu sous son bouton (position fixe : la barre coupe ce qui dépasse) ;
// fermeture au clic extérieur ou à Échap.
function brancherMenuNav(plus) {
  const btn = plus.querySelector('.nav-plus-btn'), menu = plus.querySelector('.nav-menu');
  btn.onclick = e => {
    e.stopPropagation();
    if (!menu.hidden) return fermerMenuNav();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + 'px';
  };
  document.addEventListener('click', e => { if (!e.target.closest('.nav-plus')) fermerMenuNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerMenuNav(); });
}

// redimensionnement : on recalcule (une fois les mouvements de la fenêtre terminés)
let attenteNav = 0;
addEventListener('resize', () => { clearTimeout(attenteNav); attenteNav = setTimeout(ajusterNav, 120); });
addEventListener('load', () => ajusterNav());   // polices chargées : largeurs définitives

// Petit engrenage décoratif à côté du logo (forme du logo, gearPath). Un seul élément animé,
// uniquement en transform (API Web Animations) : un tour en 16 s au repos ; au survol d'un lien,
// de la cloche, de l'avatar ou du menu, il accélère jusqu'à un tour par seconde, avec un lissage
// d'environ 500 ms, puis ralentit de la même façon quand le curseur quitte ces éléments.
// Immobile si « réduire les animations » est demandé ; en pause quand l'onglet n'est pas visible.
function ajouterEngrenageNav() {
  const brand = $('.brand');
  if (!brand || $('.nav-gear')) return;
  brand.insertAdjacentHTML('afterend', `<svg class="nav-gear" viewBox="-30 -30 60 60" aria-hidden="true">
      <path fill-rule="evenodd" d="${gearPath(12, 4, 7)}"/></svg>`);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return;
  const anim = $('.nav-gear').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 16000, iterations: Infinity });
  let vitesse = 1, cible = 1, boucle = 0;
  // lissage : la vitesse rejoint la cible en ~500 ms (aucun saut, même au changement de sens)
  const lisser = () => {
    vitesse += (cible - vitesse) * 0.12;
    if (Math.abs(cible - vitesse) < 0.02) vitesse = cible;
    anim.playbackRate = vitesse;
    boucle = vitesse === cible ? 0 : requestAnimationFrame(lisser);
  };
  const viser = v => { cible = v; if (!boucle) boucle = requestAnimationFrame(lisser); };
  const barre = $('header.top');
  barre.addEventListener('pointerover', e => {
    // sens constant : une vitesse négative ramènerait l'animation infinie à son début et l'arrêterait
    viser(e.target.closest('#nav a, .nav-plus-btn, .cloche, .user-bloc') ? 16 : 1);
  });
  barre.addEventListener('pointerleave', () => viser(1));
  document.addEventListener('visibilitychange', () =>
    document.visibilityState === 'visible' ? anim.play() : anim.pause());
}

/* ---------- Notifications : cloche, panneau déroulant et rafraîchissement ---------- */

// Petites icônes SVG (couleur du texte via currentColor).
const ICONES = {
  cloche: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0Z"/></svg>`,
  message: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>`,
  tache: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z"/></svg>`,
  ajout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"/></svg>`
};

// Icône et classe de couleur de chaque type de notification.
const TYPES_NOTIF = {
  NouveauMessage: { ico: 'message', cls: 'msg' },
  StatutTache: { ico: 'tache', cls: 'tache' },
  TacheAjoutee: { ico: 'ajout', cls: 'ajout' }
};

// Texte d'une notification : TOUJOURS échappé d'abord, puis l'auteur (avant « a changé »,
// « a ajouté » ou « vous a affecté ») mis en gras ; le reste reste du texte brut échappé.
const texteNotification = t => esc(t).replace(/^(.+?) (a changé|a ajouté|vous a affecté) /, '<b>$1</b> $2 ');

// Date relative : « à l'instant », « il y a 5 min », « il y a 2 h », « il y a 3 j ».
// Le serveur enregistre en UTC mais SQLite rend la date sans fuseau : on la lit comme UTC.
function dateRelative(d) {
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(String(d)) ? d : d + 'Z';
  const s = Math.round((Date.now() - new Date(utc)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

// Ouvre la cible d'une notification après l'avoir marquée comme lue :
// conversation (NouveauMessage) ou page de la tâche (StatutTache).
async function ouvrirNotification(n) {
  try { await api(`/api/Notifications/${n.id}/lue`, 'PUT'); } catch {}
  location.href = n.type === 'NouveauMessage'
    ? `messages.html?avec=${n.expediteurMembreId}`
    : `tache.html?id=${n.tacheId}`;
}

// Une notification (panneau et page notifications.html) : icône du type, texte échappé,
// date relative, pastille bleue si non lue.
const ligneNotification = n => `<div class="notif ${n.lue ? '' : 'non-lue'}" data-notif="${n.id}" role="button" tabindex="0">
    <span class="notif-ico ${(TYPES_NOTIF[n.type] || TYPES_NOTIF.StatutTache).cls}">${ICONES[(TYPES_NOTIF[n.type] || TYPES_NOTIF.StatutTache).ico]}</span>
    <span class="notif-txt"><span>${texteNotification(n.texte)}</span><span class="sub">${dateRelative(n.dateCreation)}</span></span>
    ${n.lue ? '' : '<span class="notif-point" title="Non lue"></span>'}
  </div>`;

let notifNonLues = null;   // dernier nombre connu (null = premier chargement : pas de toast)
let notifMinuteur = null;  // minuteur de rafraîchissement (15 s)
let notifListe = [];       // notifications affichées dans le panneau

// Panneau : les 8 dernières notifications et les deux actions.
async function chargerPanneau() {
  const p = $('#notifPanel');
  try {
    notifListe = list(await api('/api/Notifications?page=1&pageSize=8'));
    p.innerHTML = `<div class="notif-tete"><b>Notifications</b>
        <button class="linkbtn" id="notifToutLu" type="button">Tout marquer comme lu</button></div>
      ${notifListe.length ? notifListe.map(ligneNotification).join('') : '<p class="stat-vide">Aucune notification</p>'}
      <a class="notif-pied plink" href="notifications.html">Voir toutes les notifications</a>`;
    $('#notifToutLu').onclick = async () => {
      try { await api('/api/Notifications/lues', 'PUT'); await majNotifications(); await chargerPanneau(); }
      catch (e) { toast(e.message, true); }
    };
  } catch {
    p.innerHTML = '<p class="stat-vide">Notifications indisponibles</p>';
  }
}

// Badge : une seule requête par cycle ; toast discret quand le nombre de non lues augmente.
async function majNotifications() {
  try {
    const { nonLues } = await api('/api/Notifications/non-lues');
    const change = nonLues !== notifNonLues;
    if (notifNonLues != null && nonLues > notifNonLues) toast('Nouvelle notification');
    notifNonLues = nonLues;
    const b = $('#cloche .nav-badge');
    if (b) { b.textContent = nonLues > 9 ? '9+' : nonLues; b.hidden = !nonLues; }
    if (change && $('#notifPanel') && !$('#notifPanel').hidden) chargerPanneau();
  } catch {
    // 401 : api() a déjà supprimé le token et renvoie vers login ; on arrête le minuteur
    if (!session()) clearInterval(notifMinuteur);
  }
}

// Branche la cloche (ouverture, fermeture au clic extérieur ou à Échap) et le minuteur.
function initNotifications() {
  const cloche = $('#cloche'), p = $('#notifPanel');
  if (!cloche) return;
  const fermer = () => { p.hidden = true; cloche.setAttribute('aria-expanded', 'false'); };
  cloche.onclick = e => {
    e.stopPropagation();
    if (!p.hidden) return fermer();
    p.hidden = false;
    cloche.setAttribute('aria-expanded', 'true');
    chargerPanneau();
  };
  // clic sur une notification du panneau : marquer lue puis ouvrir la cible
  p.onclick = e => {
    e.stopPropagation();
    const el = e.target.closest('[data-notif]');
    const n = el && notifListe.find(x => x.id === +el.dataset.notif);
    if (n) ouvrirNotification(n);
  };
  p.onkeydown = e => { if (e.key === 'Enter' && e.target.closest('[data-notif]')) p.onclick(e); };
  document.addEventListener('click', e => { if (!e.target.closest('.cloche-zone')) fermer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); });
  majNotifications();
  // toutes les 15 s, seulement si la page est visible
  notifMinuteur = setInterval(() => { if (document.visibilityState === 'visible') majNotifications(); }, 15000);
}

// Lien « Messages » (ajouté à la fin du menu) + badge du nombre de messages non lus.
// Seulement pour un compte qui a une fiche membre : sinon l'API répond 403
// (« Compte sans fiche membre »), ce qu'on retient pour la session pour ne plus appeler.
async function majMessages(active) {
  const cle = 'sansFiche:' + norm(session()?.name);
  // l'Admin participe à la messagerie sans fiche Membre : jamais considéré « sans fiche »
  if (!session()?.admin) try { if (sessionStorage.getItem(cle) === '1') return; } catch {}
  try {
    const { nonLus } = await api('/api/Messages/non-lus');
    if (!$('#navMessages')) $('#nav').insertAdjacentHTML('beforeend',
      `<a id="navMessages" href="messages.html" class="${active === 'messages' ? 'on' : ''}">Messages
        <span class="nav-badge" hidden></span></a>`);
    const b = $('#navMessages .nav-badge');
    b.textContent = nonLus > 99 ? '99+' : nonLus;
    b.hidden = !nonLus;
    ajusterNav();   // le lien « Messages » vient d'arriver : la place a changé
  } catch (e) {
    if (/réservée/.test(e.message)) try { sessionStorage.setItem(cle, '1'); } catch {}
  }
}

/* ---------- Pied de page (identique sur toutes les pages) ---------- */

// Remplit le <footer> de la page (ou le crée s'il manque) : logo + nom, sujet, technologies,
// puis la ligne de copyright. Aucun lien : rien ne mène vers une page protégée.
function renderFooter() {
  let f = $('footer');
  if (!f) { f = document.createElement('footer'); document.body.appendChild(f); }
  f.className = 'foot';
  f.innerHTML = `<div class="wrap">
      <div class="foot-row">
        <span class="foot-brand">${gearLogo()}Projets &amp; Tâches</span>
        <span>Projet d'examen .NET · Sujet 5 : Gestion de projets et de tâches</span>
        <span class="foot-tech">ASP.NET Core · EF Core · JWT</span>
      </div>
      <div class="foot-copy">© 2026 Nadeur Ouled Ahmed</div>
    </div>`;
}

/* ---------- Sections « bloc à gauche + liste à droite » (.side-row) ---------- */

// Une section dont la liste est plus haute que l'écran reçoit .is-long : son bloc de gauche
// passe alors en haut et reste visible (sticky) ; sinon il reste centré (voir style.css).
function ajusterSections() {
  const max = window.innerHeight - 100;   // hauteur visible sous la barre du haut
  document.querySelectorAll('.side-row').forEach(r => {
    const liste = r.querySelector('.pmain');
    r.classList.toggle('is-long', !!liste && liste.offsetHeight > max);
  });
}

/* ---------- Initialisation (exécutée au chargement de chaque page) ---------- */

// <body data-page="…"> indique la page courante ; hors connexion, une page
// sans session valide renvoie vers login.html.
const PAGE = document.body.dataset.page;
if (PAGE !== 'login' && !session()) location.replace('login.html');
renderTop(PAGE);
renderFooter();

// Fond commun (halos qui dérivent + grille) : une couche fixe derrière le contenu, décorative.
document.body.insertAdjacentHTML('afterbegin', `<div class="fond-anime" aria-hidden="true">
    <i class="halo halo-a"></i><i class="halo halo-b"></i><i class="halo halo-c"></i>
  </div>`);

// Sections .side-row : recalcul à chaque redessin du contenu (filtres, recherche,
// pagination…) et quand la fenêtre change de taille.
if ($('#app')) new MutationObserver(ajusterSections).observe($('#app'), { childList: true, subtree: true });
addEventListener('resize', ajusterSections);
