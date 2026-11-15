/* =====================================================================
 * stats.js : tableau de bord de lecture (stats.html)
 * - Admin  : tous les projets, toutes les cartes (dont la charge par rôle) ;
 * - Membre : seulement SES projets (ceux où il a au moins une tâche), sans charge par
 *   rôle (GET /api/Roles est réservé à l'Admin et n'est jamais appelé pour lui),
 *   avec une carte « Mes tâches » en plus.
 * Tout est chargé une fois, gardé en mémoire, puis les statistiques sont calculées
 * côté front ; le filtre « Projet » recalcule tout sans recharger la page.
 * Restreindre un membre à ses projets est un confort d'interface : le backend laisse
 * tout utilisateur connecté lire les tâches d'un projet (limite connue, voir le README),
 * aucune donnée n'est donc protégée par ce filtre.
 * ===================================================================== */

/* ---------- Données en mémoire (null = indisponible) ---------- */

let projets = [], taches = [], membres = null, nomsRoles = null, roles = {}, coms = null;

const ADMIN = !!session()?.admin;   // vue Admin (tous les projets) ou vue membre (ses projets)
let moiId = null;                   // fiche Membre de l'utilisateur connecté (vue membre)

// Couleurs des statuts, tirées des variables du thème.
const COUL = { AFaire: 'var(--muted)', EnCours: 'var(--warn)', Terminee: 'var(--ok)' };

/* =================== Calculs (aucun HTML ici) =================== */

// Pourcentage arrondi à 0,1, et son affichage à la française (« 57,1 »).
const pc = (n, total) => total ? Math.round(n * 1000 / total) / 10 : 0;
const fr = v => v.toLocaleString('fr-FR');

// Statistiques pour le projet p ('' = tous les projets).
function calculer(p) {
  const ts = p ? taches.filter(t => String(t.projetId) === p) : taches;
  const ps = p ? projets.filter(x => String(x.id) === p) : projets;
  const idsT = new Set(ts.map(t => t.id));
  const nb = st => ts.filter(t => t.statut === st).length;
  const parStatut = { AFaire: nb('AFaire'), EnCours: nb('EnCours'), Terminee: nb('Terminee') };

  // Avancement par projet, du plus en retard au plus avancé.
  const avProjets = ps.map(x => {
    const t = taches.filter(y => y.projetId === x.id);
    return { p: x, n: t.length, v: pc(t.filter(y => y.statut === 'Terminee').length, t.length) };
  }).sort((a, b) => a.v - b.v);

  // Charge par membre (liste complète, paginée à l'affichage) : total et part terminée.
  const charge = membres && membres.map(m => {
    const t = ts.filter(y => y.membreId === m.id);
    return { m, n: t.length, fini: t.filter(y => y.statut === 'Terminee').length };
  }).filter(x => x.n).sort((a, b) => b.n - a.n);

  // Charge par rôle : une tâche compte pour chaque rôle de son membre (table email -> rôles).
  const parRole = nomsRoles && membres && nomsRoles.map(r => ({
    r, n: ts.filter(t => (roles[norm(membres.find(m => m.id === t.membreId)?.email)] || []).includes(r)).length
  })).sort((a, b) => b.n - a.n);

  // Commentaires par jour sur les 14 derniers jours (tâches du filtre).
  const jours = [...Array(14)].map((_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i);
    return d;
  });
  const cs = coms && coms.filter(c => idsT.has(c.tacheId));
  const activite = cs && jours.map(d => ({
    d, n: cs.filter(c => new Date(c.dateCreation).toDateString() === d.toDateString()).length
  }));

  // Points d'attention.
  const occupes = new Set(taches.map(t => t.membreId));   // tous projets confondus
  const attention = {
    nonAffectees: ts.filter(t => t.membreId == null),
    enRetard: avProjets.filter(x => x.v < 30),
    // vue membre : on ne connaît que ses projets, cette liste n'aurait pas de sens
    sansTache: ADMIN ? membres && membres.filter(m => !occupes.has(m.id)) : undefined
  };

  // Mes tâches (vue membre) : mes chiffres dans le périmètre filtré.
  const mien = ts.filter(t => moiId != null && t.membreId === moiId);
  const mes = moiId == null ? null : {
    n: mien.length, AFaire: mien.filter(t => t.statut === 'AFaire').length,
    EnCours: mien.filter(t => t.statut === 'EnCours').length,
    Terminee: mien.filter(t => t.statut === 'Terminee').length
  };

  const nbMembres = membres && (p || !ADMIN ? new Set(ts.map(t => t.membreId).filter(x => x != null)).size : membres.length);
  return {
    nbProjets: ps.length, nbTaches: ts.length, nbMembres, nbComs: cs && cs.length,
    taux: pc(parStatut.Terminee, ts.length), parStatut, avProjets, charge, parRole, activite, attention, mes
  };
}

/* =================== Dessins (HTML à partir des calculs) =================== */

// Page courante de chaque liste paginée (remise à 1 quand le filtre change).
const pages = {};
// Pagine arr sous la clé cle (taille éléments par page) et mémorise la page retenue.
const pageDe = (cle, arr, taille) => {
  const r = paginer(arr, taille, pages[cle]);
  pages[cle] = r.page;
  return r;
};

// Ligne discrète et carte « indisponible ».
const vide = t => `<p class="stat-vide">${t}</p>`;
const indispo = vide('Données indisponibles');

// Carte de chiffre (KPI).
const kpi = (valeur, libelle) => `<div class="panel kpi">
    <b>${valeur ?? '—'}</b><span>${libelle}</span>
  </div>`;

// Barre horizontale : libellé, valeur, segments [{ pct, coul, titre }], lien facultatif.
const barre = (libelle, valeur, segments, titre) => `<div class="stat-ligne" title="${esc(titre)}">
    <div class="meta"><span class="stat-nom">${libelle}</span><b>${valeur}</b></div>
    <div class="stat-bar">${segments.map(s =>
      `<i style="width:${s.pct}%;background:${s.coul}" title="${esc(s.titre || titre)}"></i>`).join('')}</div>
  </div>`;

// Graphique en anneau (SVG) : un arc par statut, longueur proportionnelle.
function donut(st) {
  const total = st.nbTaches, C = 2 * Math.PI * 40;
  if (!total) return vide('Aucune donnée');
  let decal = 0;
  const arcs = Object.entries(st.parStatut).map(([k, n]) => {
    const l = C * n / total;
    const arc = n ? `<circle r="40" cx="60" cy="60" fill="none" stroke="${COUL[k]}" stroke-width="18"
        stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-decal}" transform="rotate(-90 60 60)">
        <title>${STATUTS[k]} : ${n} (${fr(pc(n, total))} %)</title></circle>` : '';
    decal += l;
    return arc;
  }).join('');
  return `<div class="donut">
      <svg viewBox="0 0 120 120" role="img" aria-label="Répartition des tâches par statut">
        ${arcs}<text x="60" y="58" text-anchor="middle" class="donut-total">${total}</text>
        <text x="60" y="74" text-anchor="middle" class="donut-sous">tâches</text>
      </svg>
      <div class="legende">${Object.entries(st.parStatut).map(([k, n]) => `
        <div title="${STATUTS[k]} : ${n} tâche(s)"><i style="background:${COUL[k]}"></i>
          ${STATUTS[k]} <b>${n}</b> <span>(${fr(pc(n, total))} %)</span></div>`).join('')}
      </div>
    </div>`;
}

// Avancement par projet : une barre par projet, cliquable vers le projet.
function dessinProjets(st) {
  if (!st.avProjets.length) return vide('Aucune donnée');
  const r = pageDe('projets', st.avProjets, 10);
  return r.items.map(x => `<a href="projet.html?id=${x.p.id}">${barre(esc(x.p.nom),
      `${fr(x.v)} % · ${x.n} tâche${x.n > 1 ? 's' : ''}`,
      [{ pct: x.v, coul: x.v >= 100 ? 'var(--ok)' : 'var(--accent)' }],
      `${x.p.nom} : ${fr(x.v)} % terminé sur ${x.n} tâche(s)`)}</a>`).join('') + r.html;
}

// Charge par membre : part terminée (vert) + reste (bleu), largeur relative au plus chargé.
function dessinMembres(st) {
  if (!st.charge) return indispo;
  if (!st.charge.length) return vide('Aucune donnée');
  const max = st.charge[0].n;   // échelle commune à toutes les pages
  const r = pageDe('membres', st.charge, 10);
  return r.items.map(x => barre(memberLink(x.m.id, esc(x.m.nom))
    + (x.m.id === moiId ? ' <span class="badge vous">Vous</span>' : ''), `${x.fini} / ${x.n}`, [
    { pct: x.fini * 100 / max, coul: 'var(--ok)', titre: `${x.m.nom} : ${x.fini} terminée(s)` },
    { pct: (x.n - x.fini) * 100 / max, coul: 'var(--accent)', titre: `${x.m.nom} : ${x.n - x.fini} non terminée(s)` }],
    `${x.m.nom} : ${x.n} tâche(s) dont ${x.fini} terminée(s)`)).join('') + r.html;
}

// Charge par rôle.
function dessinRoles(st) {
  if (!st.parRole) return indispo;
  const max = Math.max(...st.parRole.map(x => x.n));
  if (!max) return vide('Aucune donnée');
  const r = pageDe('roles', st.parRole, 10);
  return r.items.map(x => barre(esc(x.r), x.n,
    [{ pct: x.n * 100 / max, coul: 'var(--accent)' }], `${x.r} : ${x.n} tâche(s)`)).join('') + r.html;
}

// Histogramme des commentaires par jour (barres verticales CSS).
function dessinActivite(st) {
  if (!st.activite) return indispo;
  const max = Math.max(...st.activite.map(x => x.n));
  if (!max) return vide('Aucune donnée');
  return `<div class="histo">${st.activite.map(x => {
    const jour = x.d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    return `<div title="${jour} : ${x.n} commentaire(s)">
        <span class="histo-val">${x.n || ''}</span>
        <i style="height:${x.n * 100 / max}%"></i>
        <span class="histo-jour">${jour.slice(0, 2)}</span>
      </div>`;
  }).join('')}</div>`;
}

// Points d'attention : trois listes courtes cliquables.
function dessinAttention(st) {
  // Chaque liste est paginée par 5 (data-liste = sa clé de pagination).
  const liste = (titre, items, rendu) => {
    const r = items && items.length ? pageDe(titre, items, 5) : null;
    return `<div class="attention" data-liste="${esc(titre)}">
      <h4>${titre} (${items ? items.length : '—'})</h4>
      ${!items ? indispo : !items.length ? vide('Aucune donnée') : r.items.map(rendu).join('') + r.html}
    </div>`;
  };
  const a = st.attention;
  return liste('Tâches non affectées', a.nonAffectees,
      t => `<a class="plink" href="tache.html?id=${t.id}">${esc(t.titre)}</a>`)
    + liste('Projets sous 30 %', a.enRetard,
      x => `<a class="plink" href="projet.html?id=${x.p.id}">${esc(x.p.nom)} (${fr(x.v)} %)</a>`)
    + (ADMIN ? liste('Membres sans aucune tâche', a.sansTache,
      m => memberLink(m.id, esc(m.nom))) : '');
}

// Mes tâches (vue membre) : chiffres par statut et barre d'avancement personnel.
function dessinMesTaches(st) {
  if (!st.mes) return indispo;
  if (!st.mes.n) return vide('Aucune tâche dans ce périmètre');
  return avHtml(pct(pc(st.mes.Terminee, st.mes.n))) + Object.keys(STATUTS).map(k =>
    `<div class="meta" style="margin-top:8px"><span class="st ${k}">${STATUTS[k]}</span><b>${st.mes[k]}</b></div>`).join('');
}

// Dessine toute la page pour le projet choisi (sans rien recharger).
function draw() {
  const st = calculer($('#fP').value);
  $('#kpis').innerHTML = kpi(st.nbProjets, 'projets') + kpi(st.nbTaches, 'tâches')
    + kpi(st.nbMembres, 'membres') + kpi(st.nbComs, 'commentaires') + kpi(fr(st.taux) + ' %', 'terminées');
  $('#gStatut').innerHTML = donut(st);
  $('#gProjets').innerHTML = dessinProjets(st);
  $('#gMembres').innerHTML = dessinMembres(st);
  if ($('#gRoles')) $('#gRoles').innerHTML = dessinRoles(st);   // Admin seulement
  if ($('#gMes')) $('#gMes').innerHTML = dessinMesTaches(st);    // membre seulement
  $('#gActivite').innerHTML = dessinActivite(st);
  $('#gAttention').innerHTML = dessinAttention(st);

  // Pagination : un clic change la page de la liste concernée puis redessine.
  const suivre = (cle, zone) => brancherPager(zone, d => { pages[cle] += d; draw(); });
  suivre('projets', $('#gProjets'));
  suivre('membres', $('#gMembres'));
  suivre('roles', $('#gRoles'));
  document.querySelectorAll('#gAttention [data-liste]').forEach(z => suivre(z.dataset.liste, z));
}

/* =================== Initialisation =================== */

// Carte de graphique (titre + zone remplie par draw()).
const carte = (idZone, titre, large) => `<div class="panel${large ? ' stat-large' : ''}">
    <h3 style="margin-top:0">${titre}</h3>
    <div id="${idZone}">${skeleton(1)}</div>
  </div>`;

/* ---------- Périmètre : quels projets charger (calcul séparé du dessin) ---------- */

// Admin : tous les projets (+ rôles et comptes pour la charge par rôle).
async function perimetreAdmin(essai) {
  const [ps, ms, rs, us] = await Promise.all([
    toutes('/api/Projets'),
    essai(toutes('/api/Membres'), 'Membres'),
    essai(api('/api/Roles'), 'Rôles'),
    essai(api('/api/Roles/utilisateurs'), 'Rôles')]);
  membres = ms;
  nomsRoles = rs && us ? list(rs) : null;
  if (us) list(us).forEach(u => { roles[norm(u.email)] = u.roles || []; });
  return ps;
}

// Membre : ses projets = ceux de ses propres tâches (endpoint autorisé pour lui-même) ;
// aucun appel aux rôles.
async function perimetreMembre() {
  const [ms, mp] = await Promise.all([toutes('/api/Membres'), api('/api/projets/mes-projets')]);
  membres = ms;
  moiId = ms.find(m => norm(m.email) === norm(session()?.name))?.id ?? null;
  if (moiId == null) return [];
  const ids = new Set((await toutes(`/api/membres/${moiId}/taches`)).map(t => t.projetId));
  return list(mp).filter(p => ids.has(p.id));
}

/* ---------- Page ---------- */

view(`<div class="sec">
    <h2>${ADMIN ? 'Statistiques' : 'Statistiques de mes projets'}</h2>
    <label class="fsel" style="flex:none">
      <span>Projet</span>
      <select id="fP"><option value="">${ADMIN ? 'Tous les projets' : 'Tous mes projets'}</option></select>
    </label>
  </div>
  <div class="kpis" id="kpis">${skeleton(1)}</div>
  <div class="stats-grille">
    ${/* lignes toujours complètes : deux cartes côte à côte, ou une carte pleine largeur */ ''}
    ${ADMIN ? '' : carte('gMes', 'Mes tâches')}
    ${carte('gStatut', 'Répartition des tâches par statut')}
    ${carte('gActivite', 'Activité des commentaires (14 derniers jours)', !ADMIN)}
    ${carte('gProjets', 'Avancement par projet (du plus en retard au plus avancé)', true)}
    ${carte('gMembres', 'Charge par membre')}
    ${ADMIN ? carte('gRoles', 'Charge par rôle') : ''}
    ${carte('gAttention', "Points d'attention", ADMIN)}
  </div>`);

// Chargement en une passe : chaque source en erreur est notée (toast) et sa carte
// passe en « indisponible », sans casser le reste de la page.
const essai = (promesse, quoi) => promesse.catch(e => { toast(`${quoi} : ${e.message}`, true); return null; });
(async () => {
  const ps = ADMIN ? await perimetreAdmin(essai) : await perimetreMembre();

  // Membre sans aucune tâche : une seule ligne, pas de graphiques vides.
  if (!ADMIN && !ps.length) {
    view(`<div class="sec"><h2>Statistiques de mes projets</h2></div>
      <p class="stat-vide">Vous n'avez pas encore de projet</p>`);
    return;
  }

  projets = ps;
  taches = (await Promise.all(ps.map(p => toutes(`/api/projets/${p.id}/taches`)))).flat();
  const res = await essai(Promise.all(taches.map(t => toutes(`/api/taches/${t.id}/commentaires`))), 'Commentaires');
  coms = res && res.flat();

  $('#fP').innerHTML = `<option value="">${ADMIN ? 'Tous les projets' : 'Tous mes projets'}</option>`
    + projets.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
  $('#fP').onchange = () => { Object.keys(pages).forEach(k => delete pages[k]); draw(); };
  draw();
})().catch(e => {
  // Projets ou tâches indisponibles : rien ne peut être calculé.
  toast(e.message, true);
  ['#kpis', '#gMes', '#gStatut', '#gActivite', '#gProjets', '#gMembres', '#gRoles', '#gAttention']
    .forEach(z => { if ($(z)) $(z).innerHTML = indispo; });
});
