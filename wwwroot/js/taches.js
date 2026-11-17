/* =====================================================================
 * taches.js : page des tâches en carreaux (taches.html)
 * - Admin  : toutes les tâches (projets puis tâches de chaque projet),
 *            filtres Projet, Membre, Rôle, Statut + recherche ;
 * - Membre : uniquement ses tâches, filtres Projet et Statut + recherche.
 * Tout est chargé une fois puis filtré et paginé en mémoire.
 * Un visiteur non connecté est renvoyé vers login.html par common.js : simple confort
 * d'interface, la sécurité réelle est faite par le backend (token JWT et rôles).
 * ===================================================================== */

/* ---------- Constantes et état de la page ---------- */

const s = session(), admin = !!s?.admin;
const SIZE = PAGE_SIZE;   // nombre de tâches par page (constante commune)
let page = 1;      // page courante (de l'affichage filtré)

// taches = null : pas encore chargé ; projets = nom par id ; roles = rôles par email normalisé.
let taches = null, projets = {}, membres = [], roles = {}, nomsRoles = [];

/* ---------- Petits utilitaires ---------- */

// Liste déroulante de filtre (même rendu que la page Commentaires).
const choix = (id, label, tous) => `<label class="fsel">
    <span>${label}</span>
    <select id="${id}"><option value="">${tous}</option></select>
  </label>`;

// Remplit une liste de filtre en gardant le choix s'il est encore proposé.
const remplir = (sel, tous, items) => {
  const avant = $(sel).value;
  $(sel).innerHTML = `<option value="">${tous}</option>`
    + items.map(x => `<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');
  $(sel).value = items.some(x => String(x.value) === avant) ? avant : '';
};

// Rôles d'un membre (même source que la page Rôles) ; rôle affiché = rôle métier,
// sinon Admin ou Membre.
const rolesDe = m => roles[norm(m.email)] || [];
const metier = m => {
  const r = rolesDe(m), x = r.filter(v => v !== 'Membre' && v !== 'Admin');
  return x.length ? x.join(', ') : r.includes('Admin') ? 'Admin' : 'Membre';
};

/* ---------- Rendu ---------- */

// Carreau d'une tâche (mêmes classes que les cartes de la page Commentaires) ;
// un clic ouvre la tâche.
const carte = t => {
  const m = membres.find(x => x.id === t.membreId);
  return `<a class="card" href="tache.html?id=${t.id}">
      <div class="head">
        ${icon(t.titre)}
        <div>
          <h3>${esc(t.titre)}</h3>
          <span class="sub">${esc(projets[t.projetId] || 'Projet ' + t.projetId)}</span>
        </div>
      </div>
      <div><span class="st ${t.statut}">${STATUTS[t.statut] || esc(t.statut)}</span></div>
      <div class="meta">
        ${m ? memberLink(m.id, `<span class="tache-membre">
            <span class="mini-av" style="background:${colorOf(m.nom)}">${esc(initials(m.nom).charAt(0))}</span>
            ${esc(m.nom)} <small>· ${esc(metier(m))}</small>
          </span>`, true) : '<span>Non affectée</span>'}
        <span>#${t.id}</span>
      </div>
    </a>`;
};

// Filtre « Membre » (Admin) : seulement les membres ayant une tâche dans le projet choisi.
const remplirMembres = () => {
  const p = $('#fP').value;
  const ids = new Set(taches.filter(t => !p || String(t.projetId) === p).map(t => t.membreId));
  remplir('#fM', 'Tous', membres.filter(m => !p || ids.has(m.id)).map(m => ({ value: m.id, label: m.nom })));
};

// Applique les filtres (ET logique), pagine et redessine, sans rien recharger.
function draw() {
  if (!taches) return;
  const q = norm($('#q').value), p = $('#fP').value, st = $('#fS').value;
  const m = admin ? $('#fM').value : '', r = admin ? $('#fR').value : '';
  const f = taches.filter(t => norm(t.titre).includes(q)
    && (!p || String(t.projetId) === p)
    && (!st || t.statut === st)
    && (!m || String(t.membreId) === m)
    && (!r || rolesDe(membres.find(x => x.id === t.membreId) || {}).includes(r)));

  const pages = Math.max(1, Math.ceil(f.length / SIZE));
  page = Math.min(page, pages);
  $('#out').innerHTML = !f.length
    ? '<p style="color:var(--muted);font-size:14px;margin:4px 0">Aucun résultat</p>'
    : `<div class="grid">${f.slice((page - 1) * SIZE, page * SIZE).map(carte).join('')}</div>
      ${pages > 1 ? `<div class="pager">
        <button class="btn" id="prev" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
        <span>Page ${page} / ${pages}</span>
        <button class="btn" id="next" ${page >= pages ? 'disabled' : ''}>Suivant →</button>
      </div>` : ''}`;

  // Pagination : boutons présents seulement s'il y a plusieurs pages.
  const pv = $('#prev'), nx = $('#next');
  if (pv) pv.onclick = () => { page--; draw(); };
  if (nx) nx.onclick = () => { page++; draw(); };
}

/* ---------- Chargement des données ---------- */

// Admin : projets, membres, rôles + comptes (table email -> rôles construite une fois),
// puis les tâches de chaque projet (toutes les pages).
async function chargerAdmin() {
  const [ps, ms, rs, us] = await Promise.all([
    toutes('/api/Projets'),
    toutes('/api/Membres'),
    api('/api/Roles'),
    api('/api/Roles/utilisateurs')]);
  taches = (await Promise.all(ps.map(p => toutes(`/api/projets/${p.id}/taches`)))).flat();
  ps.forEach(p => { projets[p.id] = p.nom; });
  membres = ms;
  nomsRoles = list(rs);
  list(us).forEach(u => { roles[norm(u.email)] = u.roles || []; });
  return ps;
}

// Membre : sa fiche (par son email), ses tâches et les noms de ses projets ;
// ses rôles viennent de sa session (la liste des comptes est réservée à l'Admin).
async function chargerMembre() {
  const [ms, mp] = await Promise.all([toutes('/api/Membres'), api('/api/projets/mes-projets')]);
  const moi = ms.find(m => norm(m.email) === norm(s.name));
  if (!moi) throw new Error('Membre connecté introuvable.');
  taches = await toutes(`/api/membres/${moi.id}/taches`);
  const ps = list(mp);
  ps.forEach(p => { projets[p.id] = p.nom; });
  membres = [moi];
  roles[norm(moi.email)] = s.roles;
  return ps;
}

/* ---------- Initialisation ---------- */

view(`<div class="sec"><h2>Tâches</h2></div>
  <section class="col">
    ${bar('q', 'Rechercher par titre…')}
    <div class="frow" style="flex-wrap:wrap">
      ${choix('fP', 'Projet', 'Tous les projets')}
      ${admin ? choix('fM', 'Membre', 'Tous') + choix('fR', 'Rôle', 'Tous les rôles') : ''}
      ${choix('fS', 'Statut', 'Tous')}
    </div>
    <div id="out">${skeleton(3)}</div>
  </section>`);

(admin ? chargerAdmin() : chargerMembre()).then(ps => {
  remplir('#fP', 'Tous les projets', ps.map(p => ({ value: p.id, label: p.nom })));
  remplir('#fS', 'Tous', Object.entries(STATUTS).map(([k, l]) => ({ value: k, label: l })));
  if (admin) {
    remplirMembres();
    remplir('#fR', 'Tous les rôles', nomsRoles.map(r => ({ value: r, label: r })));
  }
  draw();

  // Événements : chaque filtre revient à la page 1 ; le projet recalcule aussi les membres.
  const filtre = () => { page = 1; draw(); };
  $('#q').oninput = $('#fS').onchange = filtre;
  $('#fP').onchange = () => { if (admin) remplirMembres(); filtre(); };
  if (admin) $('#fM').onchange = $('#fR').onchange = filtre;
}).catch(e => {
  toast(e.message, true);
  $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
});
