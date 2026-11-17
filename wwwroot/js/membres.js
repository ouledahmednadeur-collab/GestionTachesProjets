/* =====================================================================
 * membres.js : page des membres, regroupés par projet
 * - Membre : « Mon équipe par projet » (ses projets et leurs membres) ;
 * - Admin  : tous les membres par projet, + « Sans projet », création
 *            et suppression.
 * ===================================================================== */

/* ---------- Pagination (état conservé quand load() redessine après une action) ---------- */

// page = page des sections projet (6 par page) ; sec = page des membres de chaque section (10).
const pagesM = { page: 1, sec: {} };
const pagesM1 = () => { pagesM.page = 1; pagesM.sec = {}; };

// Sections paginées : rend chaque section avec rendu(section, membresDeLaPage, pagerMembres)
// puis la pagination des sections, et branche tous les boutons (redessin par draw).
function sectionsPaginees(liste, cle, rendu, draw) {
  const r = paginer(liste, PAGE_SIZE, pagesM.page);
  pagesM.page = r.page;
  setTimeout(() => {
    brancherPager($('#pgSections'), d => { pagesM.page += d; draw(); });
    document.querySelectorAll('#out [data-sec]').forEach(z =>
      brancherPager(z, d => { pagesM.sec[z.dataset.sec] += d; draw(); }));
  });
  return r.items.map(x => {
    const k = cle(x), pm = paginer(x.liste, PAGE_SIZE, pagesM.sec[k]);
    pagesM.sec[k] = pm.page;
    return rendu(x, pm, k);
  }).join('') + `<div id="pgSections">${r.html}</div>`;
}

/* ---------- Chargement, affichage et événements ---------- */

// Dessine la page selon le rôle ; rappelée après une création ou une suppression.
async function load() {
  view(`<section class="col">
    <div class="sec">
      <h2>Membres de l'équipe par projets</h2>
      <div class="actions"><button class="btn primary" id="newM">+ Nouveau membre</button></div>
    </div>
    ${bar('q')}
    <div id="out">${skeleton(1)}</div>
  </section>`);
  const s0 = session();

  if (!s0?.admin) {
    /* =================== Vue Membre : mon équipe =================== */

    view(`<section class="col">
      <div class="sec"><h2>Mon équipe par projet</h2></div>
      ${bar('q')}
      <div id="out">${skeleton(1)}</div>
    </section>`);
    const moi = norm(s0.name);   // email du membre connecté
    let projets = null;          // null = pas encore chargé
    const av = {};               // avancement par id de projet (null = appel échoué)

    // Ligne d'un coéquipier ; le membre connecté a le badge « Vous »
    // et un lien vers ses tâches.
    const ligne = m => {
      const vous = norm(m.email) === moi;
      return `<div class="line">
        ${memberLink(m.id, icon(m.nom))}
        <div class="txt">
          <b>${memberLink(m.id, esc(m.nom))}${vous ? '<span class="badge vous">Vous</span>' : ''}</b>
          <div class="sub">${esc(m.email)}</div>
        </div>
        ${vous ? `<a class="btn small" href="${memberUrl(m.id)}">Mes tâches</a>` : ''}
      </div>`;
    };

    // Une rangée par projet (infos + avancement à gauche, membres à droite), filtrée par nom.
    const draw = () => {
      if (!projets) return;
      const q = norm($('#q').value);
      const rangs = projets
        .map(p => ({ p, ms: (p.membres || []).filter(m => norm(m.nom).includes(q)) }))
        .filter(r => r.ms.length);
      $('#out').innerHTML = !projets.length
        ? emptyBox('👥', "Vous n'êtes affecté à aucun projet pour le moment.")
        : !rangs.length ? emptyBox('🔍', 'Aucun membre ne correspond à votre recherche.')
        : sectionsPaginees(rangs.map(r => ({ ...r, liste: r.ms })), x => x.p.id, ({ p, ms }, pm, k) => `<div class="prow side-row">
            <div class="pside side-block">
              ${icon(p.nom)}
              <b>${esc(p.nom)}</b>
              <span class="sub">${p.membres.length} membre${p.membres.length > 1 ? 's' : ''}</span>
              ${avHtml(av[p.id])}
              <a class="plink" href="projet.html?id=${p.id}">Ouvrir le projet →</a>
            </div>
            <div class="vsep"></div>
            <div class="pmain" data-sec="${k}">${carreaux(pm.items, ligne)}${pm.html}</div>
          </div>`, draw);
    };
    $('#q').oninput = () => { pagesM1(); draw(); };

    // Chargement : projets de l'équipe, puis l'avancement de chacun en parallèle.
    try {
      const ps = list(await api('/api/membres/mon-equipe'));
      const vals = await Promise.all(ps.map(p =>
        api(`/api/projets/${p.id}/avancement`).then(pct).catch(() => null)));
      ps.forEach((p, i) => { av[p.id] = vals[i]; });
      projets = ps;
      draw();
    } catch (e) {
      $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
    }
    return;
  }

  /* =================== Vue Admin : tous les membres =================== */

  let rangs = null;   // [{ p, v, ms }] ; p = null pour « Sans projet »
  let roles = {};     // rôles de chaque compte, par email normalisé

  // Badge de rôle, même style que celui de la barre du haut ; « Membre » par défaut.
  const badgeRole = m => {
    const r = roles[norm(m.email)] || [];
    return `<span class="badge ${r.includes('Admin') ? 'admin' : ''}">${esc(r.join(' & ') || 'Membre')}</span>`;
  };

  // Ligne d'un membre avec son rôle et ses boutons « Voir ses tâches » et « Supprimer ».
  const ligneA = m => `<div class="line">
      ${memberLink(m.id, icon(m.nom))}
      <div class="txt">
        <b>${memberLink(m.id, esc(m.nom))}</b>
        <div class="sub">${esc(m.email)}</div>
      </div>
      ${badgeRole(m)}
      <a class="btn small" href="${memberUrl(m.id)}">Voir ses tâches</a>
      <button class="btn small danger" data-del="${m.id}">Supprimer</button>
    </div>`;

  // Une rangée par projet, filtrée par la recherche sur le nom du membre.
  const draw = () => {
    if (!rangs) return;
    const q = norm($('#q').value);
    const vis = rangs.map(r => ({ ...r, f: r.ms.filter(m => norm(m.nom).includes(q)) }))
      // sans recherche, on garde aussi les projets sans membre
      .filter(r => r.f.length || (!q && r.p));
    $('#out').innerHTML = !rangs.length ? emptyBox('👥', 'Aucun membre.')
      : !vis.length ? emptyBox('🔍', 'Aucun membre ne correspond à votre recherche.')
      : sectionsPaginees(vis.map(r => ({ ...r, liste: r.f })), x => x.p ? x.p.id : 'sans', (r, pm, k) => `<div class="prow side-row">
          <div class="pside side-block">
            ${icon(r.p ? r.p.nom : 'Sans projet')}
            <b>${r.p ? esc(r.p.nom) : 'Sans projet'}</b>
            <span class="sub">${r.ms.length} membre${r.ms.length > 1 ? 's' : ''}</span>
            ${r.p ? avHtml(r.v)
              + `<a class="plink" href="projet.html?id=${r.p.id}">Ouvrir le projet →</a>` : ''}
          </div>
          <div class="vsep"></div>
          <div class="pmain" data-sec="${k}">
            ${r.f.length ? carreaux(pm.items, ligneA) + pm.html
              : tile(emptyBox('👥', 'Aucun membre sur ce projet.'))}
          </div>
        </div>`, draw);
  };

  /* ----- Événements ----- */

  // Nouveau membre.
  // Nouveau membre avec son compte de connexion (erreurs 400 / 409 de l'API : toast).
  $('#newM').onclick = () => { modal('Nouveau membre', [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Mot de passe', type: 'password', required: true }],
    async d => {
      await api('/api/Membres', 'POST', d);
      toast('Membre ajouté');
      load();
    });
    // champ mot de passe : bouton Afficher / Masquer et phrase d'aide
    brancherMotDePasse('Le membre se connectera avec cet email et ce mot de passe.');
  };

  $('#q').oninput = () => { pagesM1(); draw(); };   // recherche : retour à la page 1

  // Un seul gestionnaire pour tous les boutons « Supprimer » (délégation),
  // qui fonctionne donc aussi après un redessin.
  $('#out').onclick = e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    confirmDo('Supprimer ce membre ?', async () => {
      try {
        await api(`/api/Membres/${b.dataset.del}`, 'DELETE');
        toast('Membre supprimé');
        load();
      } catch (err) {
        toast(err.message, true);
      }
    });
  };

  /* ----- Chargement des données ----- */

  try {
    // Rôles chargés une seule fois, comme sur la page Rôles (en cas d'erreur : « Membre »).
    const [dm, dp, us] = await Promise.all([
      api('/api/Membres?page=1&pageSize=50'),
      api('/api/Projets?page=1&pageSize=50'),
      api('/api/Roles/utilisateurs').catch(() => [])]);
    const ms = list(dm), ps = list(dp);
    roles = {};
    list(us).forEach(u => { roles[norm(u.email)] = u.roles || []; });

    // Pour chaque projet, en parallèle : ses tâches et son avancement.
    const res = await Promise.all(ps.map(p => Promise.all([
      api(`/api/projets/${p.id}/taches?page=1&pageSize=50`).then(list),
      api(`/api/projets/${p.id}/avancement`).then(pct).catch(() => null)])));

    // Les membres d'un projet sont ceux qui y ont au moins une tâche.
    const avecTache = new Set();
    const rs = ps.map((p, i) => {
      // membres distincts du projet
      const ids = new Set(res[i][0].map(t => t.membreId).filter(id => id != null));
      ids.forEach(id => avecTache.add(id));
      return { p, v: res[i][1], ms: ms.filter(m => ids.has(m.id)) };
    });

    // Les membres sans aucune tâche forment le groupe « Sans projet ».
    const sans = ms.filter(m => !avecTache.has(m.id));
    if (sans.length) rs.push({ p: null, v: null, ms: sans });
    rangs = rs;
    draw();
  } catch (e) {
    $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
  }
}

/* ---------- Initialisation ---------- */

load();
