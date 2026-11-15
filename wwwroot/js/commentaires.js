/* =====================================================================
 * commentaires.js : tous les commentaires, en carreaux (réservée à l'Admin)
 * Il n'existe pas d'endpoint global : on parcourt les projets, leurs tâches,
 * puis les commentaires de chaque tâche, et on regroupe tout côté front.
 * Filtres en cascade : projet, tâche, membre (auteur), + recherche dans le texte.
 * ===================================================================== */

/* ---------- Chargement, affichage et événements ---------- */

async function load() {
  // Même protection que la page Rôles : un non-admin ne voit qu'un message.
  const s = session();
  if (!s?.admin) { view(emptyBox('🔒', 'Page réservée aux administrateurs.')); return; }

  // Structure fixe : recherche, filtres Projet / Tâche / Membre, puis les carreaux.
  view(`<div class="sec"><h2>Commentaires</h2></div>
    <section class="col">
      ${bar('q', 'Rechercher dans le texte…')}
      <div class="frow">
        <label class="fsel">
          <span>Projet</span>
          <select id="fP"><option value="">Tous les projets</option></select>
        </label>
        <label class="fsel">
          <span>Tâche</span>
          <select id="fT"><option value="">Toutes</option></select>
        </label>
        <label class="fsel">
          <span>Membre</span>
          <select id="fM"><option value="">Tous</option></select>
        </label>
      </div>
      <div id="out">${skeleton(3)}</div>
    </section>`);

  /* ----- État ----- */

  // null = pas encore chargé ; tachesParId / nomsParId / projetsParId servent à l'affichage ;
  // taches et membres = listes complètes, pour remplir les filtres en cascade.
  let page = 1;   // page courante de la grille
  let coms = null, tachesParId = {}, nomsParId = {}, projetsParId = {}, taches = [], membres = [];

  /* ----- Rendu ----- */

  // Carreau d'un commentaire (mêmes classes que les cartes de tâches) ;
  // un clic ouvre la tâche concernée.
  const carte = c => {
    const auteur = nomsParId[c.membreId] || 'Membre ' + c.membreId;
    const t = tachesParId[c.tacheId];
    return `<a class="card" href="tache.html?id=${c.tacheId}">
        <div class="head">
          ${memberLink(c.membreId, icon(auteur), true)}
          <div>
            <h3>${memberLink(c.membreId, esc(auteur), true)}</h3>
            <span class="sub">${new Date(c.dateCreation).toLocaleString('fr-FR')}</span>
          </div>
        </div>
        <div class="desc">${esc(c.contenu)}</div>
        <div class="meta">
          <span>📌 ${esc(t?.titre || 'Tâche ' + c.tacheId)}${t && projetsParId[t.projetId]
            ? ` <small>· ${esc(projetsParId[t.projetId])}</small>` : ''}</span>
          <span>#${c.tacheId}</span>
        </div>
      </a>`;
  };

  // Le commentaire c appartient-il au projet p ('' = tous les projets) ?
  const duProjet = (c, p) => !p || String(tachesParId[c.tacheId]?.projetId) === p;

  // Filtres en cascade selon le projet choisi : tâches de ce projet, et membres
  // auteurs d'au moins un commentaire de ce projet (tous si « Tous les projets »).
  // Une sélection qui n'est plus proposée revient à « Toutes » / « Tous ».
  const remplirFiltres = () => {
    const p = $('#fP').value, avantT = $('#fT').value, avantM = $('#fM').value;
    const ts = p ? taches.filter(x => String(x.projetId) === p) : taches;
    $('#fT').innerHTML = '<option value="">Toutes</option>' + ts.map(x =>
      `<option value="${x.id}">${esc(x.titre)}${p ? '' : ` (${esc(projetsParId[x.projetId] || 'Projet ' + x.projetId)})`}</option>`).join('');
    $('#fT').value = ts.some(x => String(x.id) === avantT) ? avantT : '';

    const auteurs = new Set(coms.filter(c => duProjet(c, p)).map(c => c.membreId));
    const mbs = p ? membres.filter(x => auteurs.has(x.id)) : membres;
    $('#fM').innerHTML = '<option value="">Tous</option>' + mbs.map(x =>
      `<option value="${x.id}">${esc(x.nom)}</option>`).join('');
    $('#fM').value = mbs.some(x => String(x.id) === avantM) ? avantM : '';
  };

  // Applique les filtres (ET logique) et redessine la grille, sans rien recharger.
  const draw = () => {
    if (!coms) return;
    const q = norm($('#q').value), p = $('#fP').value, t = $('#fT').value, m = $('#fM').value;
    const f = coms.filter(c => norm(c.contenu).includes(q) && duProjet(c, p)
      && (!t || String(c.tacheId) === t) && (!m || String(c.membreId) === m));
    // Grille paginée par 12 (pagination commune, page conservée tant que le filtre ne change pas).
    const r = paginer(f, 12, page);
    page = r.page;
    $('#out').innerHTML = f.length
      ? `<div class="grid">${r.items.map(carte).join('')}</div>${r.html}`
      : !coms.length ? emptyBox('💬', 'Aucun commentaire pour le moment.')
      : '<p style="color:var(--muted);font-size:14px;margin:4px 0">Aucun résultat</p>';
    brancherPager($('#out'), d => { page += d; draw(); });
  };

  /* ----- Chargement des données ----- */

  // Membres et projets, puis les tâches de chaque projet,
  // puis les commentaires de chaque tâche (toutes les pages à chaque fois).
  const [ms, ps] = await Promise.all([toutes('/api/Membres'), toutes('/api/Projets')]);
  taches = (await Promise.all(ps.map(p => toutes(`/api/projets/${p.id}/taches`)))).flat();
  membres = ms;
  const res = await Promise.all(taches.map(t => toutes(`/api/taches/${t.id}/commentaires`)));

  nomsParId = {};
  ms.forEach(x => { nomsParId[x.id] = x.nom; });
  tachesParId = {};
  taches.forEach(x => { tachesParId[x.id] = x; });

  projetsParId = {};
  ps.forEach(x => { projetsParId[x.id] = x.nom; });

  // Commentaires du plus récent au plus ancien.
  coms = res.flat().sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));

  // Listes de filtres : les projets, puis tâches et membres selon le projet choisi.
  $('#fP').innerHTML = '<option value="">Tous les projets</option>' + ps.map(x =>
    `<option value="${x.id}">${esc(x.nom)}</option>`).join('');
  remplirFiltres();
  draw();

  /* ----- Événements ----- */

  // Projet : recalcule les listes Tâche et Membre, puis l'affichage.
  // Tout changement de filtre ou de recherche revient à la page 1.
  $('#fP').onchange = () => { remplirFiltres(); page = 1; draw(); };
  $('#q').oninput = $('#fT').onchange = $('#fM').onchange = () => { page = 1; draw(); };
}

/* ---------- Initialisation ---------- */

// Une erreur de chargement remplace la grille par un message.
load().catch(e => {
  toast(e.message, true);
  const o = $('#out');
  if (o) o.innerHTML = emptyBox('⚠️', esc(e.message));
});
