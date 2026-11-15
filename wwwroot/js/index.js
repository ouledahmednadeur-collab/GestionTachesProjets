/* Page d'accueil : vue admin (3 colonnes) ou vue membre (2 colonnes) */
const admin = session().admin;
/* liste déroulante compacte, options ajoutées après le chargement */
const choix = (id, label) => `<label class="fsel"><span>${label}</span><select id="${id}"><option value="">Tous</option></select></label>`;
const hero = `<section class="hero"><h1>Gérez vos projets simplement</h1>
  <p>Suivez l'avancement, répartissez les tâches et échangez avec votre équipe.</p></section>`;
view(admin
  ? hero + `<div class="trio">
    <section class="col"><div class="sec"><h2>Membres</h2><div class="actions"><button class="btn primary" id="newM">+ Nouveau membre</button></div></div>
      ${bar('qM')}<div class="frow">${choix('fMp', 'Projet')}</div>
      <div id="outM">${skeleton(1)}</div></section>
    <div class="vsep"></div>
    <section class="col"><div class="sec"><h2>Projets</h2><div class="actions"><button class="btn primary" id="newP">+ Nouveau projet</button></div></div>
      ${bar('qP')}<div class="frow">${choix('fPm', 'Membre')}<input id="fPt" placeholder="Contient la tâche…" autocomplete="off"></div>
      <div id="outP">${skeleton(1)}</div></section>
    <div class="vsep"></div>
    <section class="col"><div class="sec"><h2>Tâches</h2><div class="actions"><button class="btn primary" id="newT">+ Nouvelle tâche</button></div></div>
      ${bar('qT')}<div class="frow">${choix('fTm', 'Membre')}${choix('fTp', 'Projet')}</div>
      <div id="outT">${skeleton(1)}</div></section>
  </div>`
  : hero + `<div class="duo">
    <section class="col"><div class="sec"><h2>Mes projets</h2></div>${bar('q')}<div id="out">${skeleton(1)}</div></section>
    <div class="vsep"></div>
    <section class="col"><div class="sec"><h2>Mes tâches</h2></div>${bar('qT')}<div id="outT">${skeleton(1)}</div></section>
  </div>`);
const ligneProjet = p => `
    <a class="line" href="projet.html?id=${p.id}">${icon(p.nom)}
      <div class="txt"><b>${esc(p.nom)}</b><div class="bar" data-av="${p.id}"><i></i></div>
      <div class="sub">${esc(p.description || 'Aucune description')}</div></div>
      <span class="end" data-avt="${p.id}">…</span>
    </a>`;
const ligneTache = t => `
        <a class="line" href="tache.html?id=${t.id}">${icon(t.titre)}
          <div class="txt"><b>${esc(t.titre)}</b><div class="sub">Projet ${t.projetId} · #${t.id}</div></div>
          <span class="st ${t.statut}">${STATUTS[t.statut] || esc(t.statut)}</span>
        </a>`;
const ligneMembre = (m, n) => `
    <a class="line" href="membre.html?id=${m.id}">${icon(m.nom)}
      <div class="txt"><b>${esc(m.nom)}</b><div class="sub">${esc(m.email)}</div></div>
      <span class="end">${n} tâche${n > 1 ? 's' : ''}</span>
    </a>`;
const avanc = {};            // pourcentages déjà chargés, par id de projet
const peindre = (id, v) => {
  const b = $(`[data-av="${id}"]`); if (!b) return;
  b.firstElementChild.style.width = v + '%'; if (v >= 100) b.classList.add('done');
  $(`[data-avt="${id}"]`).textContent = v + ' %';
};
/* avancement : un seul appel à l'API par projet, ensuite on réutilise avanc */
const avancement = f => f.forEach(async p => {
  if (p.id in avanc) return peindre(p.id, avanc[p.id]);
  try { avanc[p.id] = pct(await api(`/api/projets/${p.id}/avancement`)); peindre(p.id, avanc[p.id]); } catch {}
});

if (admin) {
  let membres = null, projets = null, taches = null;   // null = pas encore chargé
  const remplir = (sel, items) => {
    const avant = $(sel).value;   // on garde le filtre choisi
    $(sel).innerHTML = '<option value="">Tous</option>' + items.map(x => `<option value="${x.id}">${esc(x.nom)}</option>`).join('');
    $(sel).value = avant;
  };
  const drawM = () => {
    if (!membres) return;
    const q = norm($('#qM').value), p = $('#fMp').value;
    const f = membres.filter(m => norm(m.nom).includes(q)
      && (!p || taches.some(t => t.membreId === m.id && String(t.projetId) === p)));
    $('#outM').innerHTML = f.length ? carreaux(f, m => ligneMembre(m, taches.filter(t => t.membreId === m.id).length))
      : tile(emptyBox('👥', membres.length ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun membre trouvé.'));
  };
  const drawP = () => {
    if (!projets) return;
    const q = norm($('#qP').value), m = $('#fPm').value, c = norm($('#fPt').value);
    const f = projets.filter(p => norm(p.nom).includes(q)
      && (!m || taches.some(t => t.projetId === p.id && String(t.membreId) === m))
      && (!c || taches.some(t => t.projetId === p.id && norm(t.titre).includes(c))));
    $('#outP').innerHTML = f.length ? carreaux(f, ligneProjet)
      : tile(emptyBox('📁', projets.length ? 'Aucun projet ne correspond à votre recherche.' : 'Aucun projet trouvé.'));
    avancement(f);
  };
  const drawT = () => {
    if (!taches) return;
    const q = norm($('#qT').value), m = $('#fTm').value, p = $('#fTp').value;
    const f = taches.filter(t => norm(t.titre).includes(q)
      && (!m || String(t.membreId) === m) && (!p || String(t.projetId) === p));
    $('#outT').innerHTML = f.length ? carreaux(f, ligneTache)
      : tile(emptyBox('🗂️', taches.length ? 'Aucune tâche ne correspond à votre recherche.' : 'Aucune tâche trouvée.'));
  };
  $('#qM').oninput = $('#fMp').onchange = drawM;
  $('#qP').oninput = $('#fPt').oninput = $('#fPm').onchange = drawP;
  $('#qT').oninput = $('#fTm').onchange = $('#fTp').onchange = drawT;
  $('#newP').onclick = () => modal('Nouveau projet', [
    { name: 'nom', label: 'Nom', required: true }, { name: 'description', label: 'Description', type: 'textarea' }],
    async d => { await api('/api/Projets', 'POST', d); toast('Projet créé'); location.reload(); });

  /* charge membres, projets et tâches en mémoire, puis redessine les 3 colonnes */
  const charger = () => Promise.all([api('/api/Membres?page=1&pageSize=50'), api('/api/Projets?page=1&pageSize=50')])
    .then(([dm, dp]) => Promise.all(list(dp).map(p => api(`/api/projets/${p.id}/taches?page=1&pageSize=50`)))
      .then(res => {
        membres = list(dm); projets = list(dp); taches = res.flatMap(list);
        remplir('#fMp', projets); remplir('#fTp', projets);
        remplir('#fPm', membres); remplir('#fTm', membres);
        drawM(); drawP(); drawT();
      }));
  const actualiser = () => charger().catch(e => toast(e.message, true));
  $('#newM').onclick = () => modal('Nouveau membre', [
    { name: 'nom', label: 'Nom', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }],
    async d => { await api('/api/Membres', 'POST', d); toast('Membre ajouté'); actualiser(); });
  $('#newT').onclick = () => modal('Nouvelle tâche', [
    { name: 'titre', label: 'Titre', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'projetId', label: 'Projet', type: 'select', required: true,
      options: [{ value: '', label: 'Choisir un projet…' }, ...(projets || []).map(p => ({ value: p.id, label: p.nom }))] },
    { name: 'membreId', label: 'Assigner à', type: 'select',
      options: [{ value: '', label: 'Non assignée' }, ...(membres || []).map(m => ({ value: m.id, label: m.nom }))] }],
    async d => {
      const t = await api('/api/Taches', 'POST', { titre: d.titre, description: d.description, projetId: +d.projetId });
      delete avanc[t.projetId];   // l'avancement de ce projet a changé
      try {
        if (d.membreId) await api(`/api/Taches/${t.id}/affecter`, 'PUT', { membreId: +d.membreId });
        toast('Tâche créée');
      } catch (e) { toast('Tâche créée mais non assignée : ' + e.message, true); }
      actualiser();
    });

  charger().catch(e => { const err = tile(emptyBox('⚠️', esc(e.message))); ['#outM', '#outP', '#outT'].forEach(s => { $(s).innerHTML = err; }); });
} else {
  let projets = null;          // null = pas encore chargé
  const draw = () => {
    if (!projets) return;
    const q = norm($('#q').value);
    const f = projets.filter(p => norm(p.nom).includes(q));
    $('#out').innerHTML = f.length ? carreaux(f, ligneProjet)
      : tile(emptyBox('📁', projets.length ? 'Aucun projet ne correspond à votre recherche.' : 'Aucun projet trouvé.'));
    avancement(f);
  };
  $('#q').oninput = draw;
  api('/api/projets/mes-projets').then(d => { projets = list(d); draw(); })
    .catch(e => { $('#out').innerHTML = tile(emptyBox('⚠️', esc(e.message))); });

  let taches = null;           // null = pas encore chargé
  const drawT = () => {
    if (!taches) return;
    const q = norm($('#qT').value);
    const f = taches.filter(t => norm(t.titre).includes(q));
    $('#outT').innerHTML = f.length ? carreaux(f, ligneTache)
      : tile(emptyBox('🗂️', taches.length ? 'Aucune tâche ne correspond à votre recherche.' : "Vous n'avez aucune tâche pour le moment."));
  };
  $('#qT').oninput = drawT;
  api('/api/Membres?page=1&pageSize=50')
    .then(d => {
      const m = list(d).find(x => (x.email || '').toLowerCase() === session().name.toLowerCase());
      if (!m) throw new Error('Membre connecté introuvable.');
      return api(`/api/membres/${m.id}/taches?page=1&pageSize=50`);
    })
    .then(d => { taches = list(d); drawT(); })
    .catch(e => { $('#outT').innerHTML = tile(emptyBox('⚠️', esc(e.message))); });
}
