/* Page des membres */
async function load(){
  view(`<section class="col"><div class="sec"><h2>Membres de l'équipe par projets</h2><div class="actions"><button class="btn primary" id="newM">+ Nouveau membre</button></div></div>${bar('q')}<div id="out">${skeleton(1)}</div></section>`);
  const s0 = session();
  if (!s0?.admin) {
    view(`<section class="col"><div class="sec"><h2>Mon équipe par projet</h2></div>${bar('q')}<div id="out">${skeleton(1)}</div></section>`);
    const moi = norm(s0.name);   // email du membre connecté
    let projets = null;          // null = pas encore chargé
    const av = {};               // avancement par id de projet (null = appel échoué)
    const ligne = m => {
      const vous = norm(m.email) === moi;
      return `<div class="line">${icon(m.nom)}
        <div class="txt"><b>${esc(m.nom)}${vous ? '<span class="badge vous">Vous</span>' : ''}</b><div class="sub">${esc(m.email)}</div></div>
        ${vous ? `<a class="btn small" href="membre.html?id=${m.id}">Mes tâches</a>` : ''}
      </div>`;
    };
    const draw = () => {
      if (!projets) return;
      const q = norm($('#q').value);
      const rangs = projets.map(p => ({ p, ms: (p.membres || []).filter(m => norm(m.nom).includes(q)) }))
        .filter(r => r.ms.length);
      $('#out').innerHTML = !projets.length ? emptyBox('👥', "Vous n'êtes affecté à aucun projet pour le moment.")
        : !rangs.length ? emptyBox('🔍', 'Aucun membre ne correspond à votre recherche.')
        : rangs.map(({ p, ms }) => `<div class="prow">
            <div class="pside">${icon(p.nom)}<b>${esc(p.nom)}</b>
              <span class="sub">${p.membres.length} membre${p.membres.length > 1 ? 's' : ''}</span>
              ${avHtml(av[p.id])}
              <a class="plink" href="projet.html?id=${p.id}">Ouvrir le projet →</a></div>
            <div class="vsep"></div>
            <div class="pmain">${carreaux(ms, ligne)}</div>
          </div>`).join('');
    };
    $('#q').oninput = draw;
    try {
      const ps = list(await api('/api/membres/mon-equipe'));
      const vals = await Promise.all(ps.map(p => api(`/api/projets/${p.id}/avancement`).then(pct).catch(() => null)));
      ps.forEach((p, i) => { av[p.id] = vals[i]; });
      projets = ps; draw();
    }
    catch (e) { $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); }
    return;
  }
  $('#newM').onclick = () => modal('Nouveau membre', [
    { name: 'nom', label: 'Nom', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }],
    async d => { await api('/api/Membres', 'POST', d); toast('Membre ajouté'); load(); });

  let rangs = null;              // [{ p, v, ms }] ; p = null pour « Sans projet »
  const ligneA = m => `<div class="line">${icon(m.nom)}
      <div class="txt"><b>${esc(m.nom)}</b><div class="sub">${esc(m.email)}</div></div>
      <a class="btn small" href="membre.html?id=${m.id}">Voir ses tâches</a>
      <button class="btn small danger" data-del="${m.id}">Supprimer</button>
    </div>`;
  const draw = () => {
    if (!rangs) return;
    const q = norm($('#q').value);
    const vis = rangs.map(r => ({ ...r, f: r.ms.filter(m => norm(m.nom).includes(q)) }))
      .filter(r => r.f.length || (!q && r.p));   // sans recherche, on garde aussi les projets sans membre
    $('#out').innerHTML = !rangs.length ? emptyBox('👥', 'Aucun membre.')
      : !vis.length ? emptyBox('🔍', 'Aucun membre ne correspond à votre recherche.')
      : vis.map(r => `<div class="prow">
          <div class="pside">${icon(r.p ? r.p.nom : 'Sans projet')}<b>${r.p ? esc(r.p.nom) : 'Sans projet'}</b>
            <span class="sub">${r.ms.length} membre${r.ms.length > 1 ? 's' : ''}</span>
            ${r.p ? avHtml(r.v) + `<a class="plink" href="projet.html?id=${r.p.id}">Ouvrir le projet →</a>` : ''}</div>
          <div class="vsep"></div>
          <div class="pmain">${r.f.length ? carreaux(r.f, ligneA) : tile(emptyBox('👥', 'Aucun membre sur ce projet.'))}</div>
        </div>`).join('');
  };
  $('#q').oninput = draw;
  /* un seul gestionnaire pour tous les boutons « Supprimer », même après un redessin */
  $('#out').onclick = e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    confirmDo('Supprimer ce membre ?', async () => {
      try { await api(`/api/Membres/${b.dataset.del}`, 'DELETE'); toast('Membre supprimé'); load(); }
      catch (err) { toast(err.message, true); } });
  };

  try {
    const [dm, dp] = await Promise.all([api('/api/Membres?page=1&pageSize=50'), api('/api/Projets?page=1&pageSize=50')]);
    const ms = list(dm), ps = list(dp);
    /* pour chaque projet, en parallèle : ses tâches et son avancement */
    const res = await Promise.all(ps.map(p => Promise.all([
      api(`/api/projets/${p.id}/taches?page=1&pageSize=50`).then(list),
      api(`/api/projets/${p.id}/avancement`).then(pct).catch(() => null)])));
    const avecTache = new Set();
    const rs = ps.map((p, i) => {
      const ids = new Set(res[i][0].map(t => t.membreId).filter(id => id != null));   // membres distincts du projet
      ids.forEach(id => avecTache.add(id));
      return { p, v: res[i][1], ms: ms.filter(m => ids.has(m.id)) };
    });
    const sans = ms.filter(m => !avecTache.has(m.id));
    if (sans.length) rs.push({ p: null, v: null, ms: sans });
    rangs = rs; draw();
  } catch (e) { $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); }
}
load();
