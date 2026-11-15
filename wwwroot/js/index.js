/* =====================================================================
 * index.js : page d'accueil
 * - Admin  : 3 colonnes (Membres, Projets, Tâches) avec recherche et filtres ;
 * - Membre : 2 colonnes (Mes projets, Mes tâches).
 * Les données sont chargées une fois puis filtrées en mémoire.
 * ===================================================================== */

/* ---------- Constantes ---------- */

const admin = session().admin;

// Liste déroulante compacte de filtre ; ses options sont ajoutées après le chargement.
const choix = (id, label) => `<label class="fsel">
    <span>${label}</span>
    <select id="${id}"><option value="">Tous</option></select>
  </label>`;

// Bandeau de titre commun aux deux vues.
const hero = `<section class="hero">
    <h1>Gérez vos projets simplement</h1>
    <p>Suivez l'avancement, répartissez les tâches et échangez avec votre équipe.</p>
  </section>`;

/* ---------- Rendu d'une ligne (projet, tâche, membre) ---------- */

// Ligne de projet ; sa barre d'avancement est remplie plus tard par peindre().
const ligneProjet = p => `
  <a class="line" href="projet.html?id=${p.id}">
    ${icon(p.nom)}
    <div class="txt">
      <b>${esc(p.nom)}</b>
      <div class="bar" data-av="${p.id}"><i></i></div>
      <div class="sub">${esc(p.description || 'Aucune description')}</div>
    </div>
    <span class="end" data-avt="${p.id}">…</span>
  </a>`;

// Ligne de tâche avec son statut.
const ligneTache = t => `
  <a class="line" href="tache.html?id=${t.id}">
    ${icon(t.titre)}
    <div class="txt">
      <b>${esc(t.titre)}</b>
      <div class="sub">Projet ${t.projetId} · #${t.id}</div>
    </div>
    <span class="st ${t.statut}">${STATUTS[t.statut] || esc(t.statut)}</span>
  </a>`;

// Ligne de membre avec son nombre de tâches n.
const ligneMembre = (m, n) => `
  <a class="line" href="${memberUrl(m.id)}">
    ${icon(m.nom)}
    <div class="txt">
      <b>${esc(m.nom)}</b>
      <div class="sub">${esc(m.email)}</div>
    </div>
    <span class="end">${n} tâche${n > 1 ? 's' : ''}</span>
  </a>`;

/* ---------- Avancement des projets ---------- */

const avanc = {};   // pourcentages déjà chargés, par id de projet

// Met à jour la barre et le pourcentage d'un projet déjà affiché.
const peindre = (id, v) => {
  const b = $(`[data-av="${id}"]`);
  if (!b) return;
  b.firstElementChild.style.width = v + '%';
  if (v >= 100) b.classList.add('done');
  $(`[data-avt="${id}"]`).textContent = v + ' %';
};

// Un seul appel à l'API par projet : ensuite on réutilise la valeur gardée dans avanc.
const avancement = f => f.forEach(async p => {
  if (p.id in avanc) return peindre(p.id, avanc[p.id]);
  try {
    avanc[p.id] = pct(await api(`/api/projets/${p.id}/avancement`));
    peindre(p.id, avanc[p.id]);
  } catch {}
});

/* ---------- Pagination des colonnes (10 lignes par page, pagination commune) ---------- */

const pg = {};   // page courante de chaque colonne, par clé

// Remplit la colonne zone avec la page courante de f, ajoute les boutons et les branche.
// Renvoie les éléments affichés (pour ne peindre l'avancement que des projets visibles).
const colonne = (zone, cle, f, rendu, redessiner) => {
  const r = paginer(f, 10, pg[cle]);
  pg[cle] = r.page;
  $(zone).innerHTML = carreaux(r.items, rendu) + r.html;
  brancherPager($(zone), d => { pg[cle] += d; redessiner(); });
  return r.items;
};

/* ---------- Initialisation : squelette de la page selon le rôle ---------- */

view(admin
  ? hero + `<div class="trio">
    <section class="col">
      <div class="sec">
        <h2>Membres</h2>
        <div class="actions"><button class="btn primary" id="newM">+ Nouveau membre</button></div>
      </div>
      ${bar('qM')}
      <div class="frow">${choix('fMp', 'Projet')}</div>
      <div id="outM">${skeleton(1)}</div>
    </section>

    <div class="vsep"></div>

    <section class="col">
      <div class="sec">
        <h2>Projets</h2>
        <div class="actions"><button class="btn primary" id="newP">+ Nouveau projet</button></div>
      </div>
      ${bar('qP')}
      <div class="frow">
        ${choix('fPm', 'Membre')}
        <input id="fPt" placeholder="Contient la tâche…" autocomplete="off">
      </div>
      <div id="outP">${skeleton(1)}</div>
    </section>

    <div class="vsep"></div>

    <section class="col">
      <div class="sec">
        <h2>Tâches</h2>
        <div class="actions"><button class="btn primary" id="newT">+ Nouvelle tâche</button></div>
      </div>
      ${bar('qT')}
      <div class="frow">
        ${choix('fTm', 'Membre')}
        ${choix('fTp', 'Projet')}
      </div>
      <div id="outT">${skeleton(1)}</div>
    </section>
  </div>`
  : hero + `<div class="duo">
    <section class="col">
      <div class="sec"><h2>Mes projets</h2></div>
      ${bar('q')}
      <div id="out">${skeleton(1)}</div>
    </section>

    <div class="vsep"></div>

    <section class="col">
      <div class="sec"><h2>Mes tâches</h2></div>
      ${bar('qT')}
      <div id="outT">${skeleton(1)}</div>
    </section>
  </div>`);

if (admin) {
  /* =================== Vue Admin : 3 colonnes =================== */

  let membres = null, projets = null, taches = null;   // null = pas encore chargé

  // Remplit une liste de filtre en conservant le choix déjà fait.
  const remplir = (sel, items) => {
    const avant = $(sel).value;
    $(sel).innerHTML = '<option value="">Tous</option>'
      + items.map(x => `<option value="${x.id}">${esc(x.nom)}</option>`).join('');
    $(sel).value = avant;
  };

  /* ----- Rendu des colonnes (recherche + filtres appliqués en mémoire) ----- */

  // Membres : filtre par nom et par projet (membre ayant une tâche dans ce projet).
  const drawM = () => {
    if (!membres) return;
    const q = norm($('#qM').value), p = $('#fMp').value;
    const f = membres.filter(m => norm(m.nom).includes(q)
      && (!p || taches.some(t => t.membreId === m.id && String(t.projetId) === p)));
    if (f.length) colonne('#outM', 'M', f, m => ligneMembre(m, taches.filter(t => t.membreId === m.id).length), drawM);
    else $('#outM').innerHTML = tile(emptyBox('👥', membres.length
        ? 'Aucun membre ne correspond à votre recherche.'
        : 'Aucun membre trouvé.'));
  };

  // Projets : filtre par nom, par membre et par titre de tâche contenue.
  const drawP = () => {
    if (!projets) return;
    const q = norm($('#qP').value), m = $('#fPm').value, c = norm($('#fPt').value);
    const f = projets.filter(p => norm(p.nom).includes(q)
      && (!m || taches.some(t => t.projetId === p.id && String(t.membreId) === m))
      && (!c || taches.some(t => t.projetId === p.id && norm(t.titre).includes(c))));
    if (f.length) avancement(colonne('#outP', 'P', f, ligneProjet, drawP));
    else $('#outP').innerHTML = tile(emptyBox('📁', projets.length
        ? 'Aucun projet ne correspond à votre recherche.'
        : 'Aucun projet trouvé.'));
  };

  // Tâches : filtre par titre, par membre et par projet.
  const drawT = () => {
    if (!taches) return;
    const q = norm($('#qT').value), m = $('#fTm').value, p = $('#fTp').value;
    const f = taches.filter(t => norm(t.titre).includes(q)
      && (!m || String(t.membreId) === m) && (!p || String(t.projetId) === p));
    if (f.length) colonne('#outT', 'T', f, ligneTache, drawT);
    else $('#outT').innerHTML = tile(emptyBox('🗂️', taches.length
        ? 'Aucune tâche ne correspond à votre recherche.'
        : 'Aucune tâche trouvée.'));
  };

  /* ----- Chargement des données ----- */

  // Charge membres et projets, puis les tâches de chaque projet,
  // remplit les listes de filtres et redessine les 3 colonnes.
  const charger = () => Promise.all([
    api('/api/Membres?page=1&pageSize=50'),
    api('/api/Projets?page=1&pageSize=50')])
    .then(([dm, dp]) => Promise.all(
      list(dp).map(p => api(`/api/projets/${p.id}/taches?page=1&pageSize=50`)))
      .then(res => {
        membres = list(dm); projets = list(dp); taches = res.flatMap(list);
        remplir('#fMp', projets); remplir('#fTp', projets);
        remplir('#fPm', membres); remplir('#fTm', membres);
        drawM(); drawP(); drawT();
      }));

  // Rechargement après une création ; une erreur s'affiche en toast.
  const actualiser = () => charger().catch(e => toast(e.message, true));

  /* ----- Événements ----- */

  // Recherche et filtres : on redessine la colonne concernée.
  // (un changement de recherche ou de filtre revient à la page 1 de la colonne)
  $('#qM').oninput = $('#fMp').onchange = () => { pg.M = 1; drawM(); };
  $('#qP').oninput = $('#fPt').oninput = $('#fPm').onchange = () => { pg.P = 1; drawP(); };
  $('#qT').oninput = $('#fTm').onchange = $('#fTp').onchange = () => { pg.T = 1; drawT(); };

  // Nouveau projet : la page est rechargée entièrement après la création.
  $('#newP').onclick = () => modal('Nouveau projet', [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'description', label: 'Description', type: 'textarea' }],
    async d => {
      await api('/api/Projets', 'POST', d);
      toast('Projet créé');
      location.reload();
    });

  // Nouveau membre.
  $('#newM').onclick = () => modal('Nouveau membre', [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true }],
    async d => {
      await api('/api/Membres', 'POST', d);
      toast('Membre ajouté');
      actualiser();
    });

  // Nouvelle tâche : création, puis affectation si un membre est choisi.
  $('#newT').onclick = () => modal('Nouvelle tâche', [
    { name: 'titre', label: 'Titre', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'projetId', label: 'Projet', type: 'select', required: true,
      options: [
        { value: '', label: 'Choisir un projet…' },
        ...(projets || []).map(p => ({ value: p.id, label: p.nom }))] },
    { name: 'membreId', label: 'Assigner à', type: 'select',
      options: [
        { value: '', label: 'Non assignée' },
        ...(membres || []).map(m => ({ value: m.id, label: m.nom }))] }],
    async d => {
      const t = await api('/api/Taches', 'POST',
        { titre: d.titre, description: d.description, projetId: +d.projetId });
      delete avanc[t.projetId];   // l'avancement de ce projet a changé
      try {
        if (d.membreId) await api(`/api/Taches/${t.id}/affecter`, 'PUT', { membreId: +d.membreId });
        toast('Tâche créée');
      } catch (e) {
        toast('Tâche créée mais non assignée : ' + e.message, true);
      }
      actualiser();
    });

  /* ----- Initialisation ----- */

  // Premier chargement ; en cas d'erreur, le message remplace les 3 colonnes.
  charger().catch(e => {
    const err = tile(emptyBox('⚠️', esc(e.message)));
    ['#outM', '#outP', '#outT'].forEach(s => { $(s).innerHTML = err; });
  });
} else {
  /* =================== Vue Membre : 2 colonnes =================== */

  let projets = null;   // null = pas encore chargé
  let taches = null;    // null = pas encore chargé

  /* ----- Rendu des colonnes ----- */

  // Mes projets, filtrés par nom.
  const draw = () => {
    if (!projets) return;
    const q = norm($('#q').value);
    const f = projets.filter(p => norm(p.nom).includes(q));
    if (f.length) avancement(colonne('#out', 'mP', f, ligneProjet, draw));
    else $('#out').innerHTML = tile(emptyBox('📁', projets.length
        ? 'Aucun projet ne correspond à votre recherche.'
        : 'Aucun projet trouvé.'));
  };

  // Mes tâches, filtrées par titre.
  const drawT = () => {
    if (!taches) return;
    const q = norm($('#qT').value);
    const f = taches.filter(t => norm(t.titre).includes(q));
    if (f.length) colonne('#outT', 'mT', f, ligneTache, drawT);
    else $('#outT').innerHTML = tile(emptyBox('🗂️', taches.length
        ? 'Aucune tâche ne correspond à votre recherche.'
        : "Vous n'avez aucune tâche pour le moment."));
  };

  /* ----- Événements et chargement ----- */

  // Colonne « Mes projets » : le serveur ne renvoie que les projets du membre connecté.
  $('#q').oninput = () => { pg.mP = 1; draw(); };
  api('/api/projets/mes-projets').then(d => { projets = list(d); draw(); })
    .catch(e => { $('#out').innerHTML = tile(emptyBox('⚠️', esc(e.message))); });

  // Colonne « Mes tâches » : on retrouve le membre connecté par son email
  // (le nom de la session), puis on charge ses tâches.
  $('#qT').oninput = () => { pg.mT = 1; drawT(); };
  api('/api/Membres?page=1&pageSize=50')
    .then(d => {
      const m = list(d).find(x => (x.email || '').toLowerCase() === session().name.toLowerCase());
      if (!m) throw new Error('Membre connecté introuvable.');
      return api(`/api/membres/${m.id}/taches?page=1&pageSize=50`);
    })
    .then(d => { taches = list(d); drawT(); })
    .catch(e => { $('#outT').innerHTML = tile(emptyBox('⚠️', esc(e.message))); });
}
