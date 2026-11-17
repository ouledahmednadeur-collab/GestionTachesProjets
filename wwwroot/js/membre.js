/* =====================================================================
 * membre.js : profil d'un membre (membre.html?id=…)
 * Visibilité des tâches affichées :
 * - Admin, ou le membre sur SON profil : toutes ses tâches ;
 * - membre sur le profil d'un collègue : seulement les tâches du collègue dans les
 *   projets en commun (projets où chacun des deux a au moins une tâche).
 * Ce filtre « projets en commun » est un confort d'interface : le backend laisse tout
 * utilisateur connecté lire les tâches d'un projet (limite connue, voir le README),
 * et GET /api/membres/{id}/taches reste protégé par le backend (403 pour un collègue) :
 * on ne l'appelle donc jamais pour un collègue.
 * ===================================================================== */

/* ---------- Constantes et état de la page ---------- */

let id = +param('id');     // identifiant du membre lu dans l'URL (?moi=1 : le membre connecté)
const SIZE = PAGE_SIZE;    // nombre de tâches par page (constante commune)
const MAX_COMS = 20;       // derniers commentaires : cherchés dans les 20 tâches les plus récentes
let page = 1;              // page courante de la liste des tâches

/* ---------- Petits rendus ---------- */

// Ligne discrète (liste vide, aucun résultat…).
const discret = t => `<p style="color:var(--muted);font-size:14px;margin:4px 0">${t}</p>`;

// Puce de chiffre de l'en-tête (ex. « 3 terminées »).
const puce = (n, txt) => `<span class="badge">${n} ${txt}</span>`;

/* ---------- Initialisation : squelette pendant le chargement ---------- */

view(`<div class="crumb"><a href="membres.html">Membres</a></div>${skeleton(3)}`);

/* ---------- Admin : bloc « Gérer ce membre » ---------- */

// Visible seulement pour l'Admin (le backend refuse de toute façon ces actions aux autres : 403).
// Réutilise les endpoints existants : POST /api/Taches, PUT /api/Taches/{id}/affecter,
// POST /api/Roles/attribuer et DELETE /api/Roles/retirer (avec projetId : rôle par projet).
// recharger() : redessine la page avec des données fraîches, sans recharger le navigateur.
async function gererMembre({ m, ids, projets, affectations, recharger }) {
  const zone = $('#gestion');
  if (!zone) return;
  const nomP = pid => projets.find(p => p.id === pid)?.nom || 'Projet ' + pid;

  // Rôles attribuables dans un projet (Admin et Membre restent globaux) et leurs privilèges.
  const [tous, catalogue] = await Promise.all([api('/api/Roles').then(list), api('/api/Roles/privileges')]);
  const rolesProjet = tous.filter(r => r !== 'Admin' && r !== 'Membre');
  const privs = {};
  await Promise.all(rolesProjet.map(async r => {
    privs[r] = await api(`/api/Roles/${encodeURIComponent(r)}/privileges`).catch(() => []);
  }));
  // Infobulle d'un rôle : ses privilèges en clair.
  const infobulle = r => 'Privilèges : ' + ((privs[r] || [])
    .map(k => catalogue.find(p => p.cle === k)?.libelle || k).join(', ') || 'aucun');
  const optionsRoles = (exclus = []) => rolesProjet.filter(r => !exclus.includes(r))
    .map(r => `<option value="${esc(r)}" title="${esc(infobulle(r))}">${esc(r)}</option>`).join('');

  // Boutons d'action puis, pour chaque projet du membre : ses rôles (× pour retirer) et un
  // sélecteur pour en ajouter (privilèges du rôle choisi affichés dessous).
  zone.innerHTML = `<div class="row">
      <button class="btn small primary" type="button" data-g="ajouter">Ajouter à un projet</button>
      <button class="btn small" type="button" data-g="donner">Donner une tâche</button>
    </div>
    <h4 class="gestion-titre">Rôles dans ses projets</h4>
    ${ids.length ? ids.map(pid => {
      const mes = affectations.filter(a => a.projetId === pid).map(a => a.role);
      const restants = optionsRoles(mes);
      return `<div class="droits-projet">
        <a href="projet.html?id=${pid}">${esc(nomP(pid))}</a>
        <div class="mes-droits">${mes.map(r => `<span class="role-pill metier" title="${esc(infobulle(r))}">${esc(r)}
            <button type="button" class="pill-x" data-retirer="${esc(r)}" data-projet="${pid}"
              aria-label="Retirer le rôle ${esc(r)}">×</button></span>`).join('') || '<span class="sub">Aucun rôle</span>'}</div>
        ${restants ? `<div class="row gestion-ajout">
            <select data-role-projet="${pid}"><option value="">Ajouter un rôle…</option>${restants}</select>
            <button class="btn small" type="button" data-ajouter-role="${pid}">Ajouter</button>
          </div>
          <p class="sub" data-info="${pid}"></p>` : ''}
      </div>`;
    }).join('') : '<p class="sub">Aucun projet : utilisez « Ajouter à un projet ».</p>'}`;

  // Actions des boutons du bloc (délégation).
  zone.onclick = e => {
    const g = e.target.closest('[data-g]');
    if (g) return ouvrir(g.dataset.g);
    const x = e.target.closest('[data-retirer]');
    if (x) return confirmDo(`Retirer le rôle « ${x.dataset.retirer} » à ${m.nom} dans « ${nomP(+x.dataset.projet)} » ?`, async () => {
      try {
        await api('/api/Roles/retirer', 'DELETE', { email: m.email, role: x.dataset.retirer, projetId: +x.dataset.projet });
        toast('Rôle retiré');
        recharger();
      } catch (er) { toast(er.message, true); }
    });
    const a = e.target.closest('[data-ajouter-role]');
    if (a) {
      const pid = +a.dataset.ajouterRole, role = zone.querySelector(`[data-role-projet="${pid}"]`).value;
      if (!role) return toast('Choisissez un rôle', true);
      api('/api/Roles/attribuer', 'POST', { email: m.email, role, projetId: pid })
        .then(() => { toast('Rôle attribué'); recharger(); })
        .catch(er => toast(er.message, true));
    }
  };
  // Choix d'un rôle dans un sélecteur : ses privilèges affichés dessous.
  zone.onchange = e => {
    const sel = e.target.closest('[data-role-projet]');
    if (sel) zone.querySelector(`[data-info="${sel.dataset.roleProjet}"]`).textContent = sel.value ? infobulle(sel.value) : '';
  };

  // Fenêtre « Ajouter à un projet » (tous les projets, rôle facultatif) ou « Donner une tâche »
  // (projets du membre) : tâche existante du projet, ou nouvelle tâche déjà affectée au membre.
  const ouvrir = mode => {
    const choix = mode === 'donner' ? projets.filter(p => ids.includes(p.id)) : projets;
    if (!choix.length) return toast('Ce membre n\'est dans aucun projet : utilisez « Ajouter à un projet »', true);
    const fen = document.createElement('div');
    fen.className = 'modal';
    fen.innerHTML = `<form class="box">
        <h3>${mode === 'donner' ? 'Donner une tâche' : 'Ajouter à un projet'} : ${esc(m.nom)}</h3>
        <label>Projet</label>
        <input data-cherche placeholder="Rechercher un projet…" autocomplete="off">
        <select name="projetId" required></select>
        <label>Tâche</label>
        <select name="tacheId"><option value="">— Créer une nouvelle tâche —</option></select>
        <div data-nouvelle>
          <label>Titre</label>
          <input name="titre" maxlength="150">
          <label>Description</label>
          <textarea name="description" rows="2" maxlength="500"></textarea>
        </div>
        ${mode === 'ajouter' ? `<label>Rôle dans ce projet (facultatif)</label>
          <select name="role"><option value="">— Aucun —</option>${optionsRoles()}</select>` : ''}
        <div class="foot">
          <button type="button" class="btn" data-x>Annuler</button>
          <button class="btn primary">Valider</button>
        </div>
      </form>`;
    document.body.appendChild(fen);
    const form = fen.querySelector('form');
    const fermer = () => { fen.remove(); document.removeEventListener('keydown', echap); };
    const echap = e => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', echap);
    fen.addEventListener('click', e => { if (e.target === fen || e.target.hasAttribute('data-x')) fermer(); });

    // Liste des projets filtrée par la recherche ; un changement de projet recharge ses tâches.
    const remplirProjets = q => {
      form.projetId.innerHTML = '<option value="">Choisir un projet…</option>' + choix
        .filter(p => norm(p.nom).includes(norm(q)))
        .map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
    };
    const chargerTaches = async () => {
      const pid = form.projetId.value;
      const ts = pid ? await toutes(`/api/projets/${pid}/taches`).catch(() => []) : [];
      form.tacheId.innerHTML = '<option value="">— Créer une nouvelle tâche —</option>' + ts
        .filter(t => t.membreId !== m.id)   // pas celles qu'il a déjà
        .map(t => `<option value="${t.id}">${esc(t.titre)}${t.membreId == null ? ' (non affectée)' : ' (déjà affectée)'}</option>`).join('');
      basculer();
    };
    // Champs « nouvelle tâche » visibles seulement si aucune tâche existante n'est choisie.
    const basculer = () => { fen.querySelector('[data-nouvelle]').hidden = !!form.tacheId.value; };
    fen.querySelector('[data-cherche]').oninput = e => { remplirProjets(e.target.value); chargerTaches(); };
    form.projetId.onchange = chargerTaches;
    form.tacheId.onchange = basculer;
    remplirProjets('');

    form.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (!d.projetId) return toast('Choisissez un projet', true);
      if (!d.tacheId && !d.titre.trim()) return toast('Choisissez une tâche ou donnez un titre', true);
      try {
        // 1. tâche : existante, ou créée dans le projet ; 2. affectation au membre
        const tid = d.tacheId || (await api('/api/Taches', 'POST',
          { titre: d.titre.trim(), description: d.description, projetId: +d.projetId })).id;
        await api(`/api/Taches/${tid}/affecter`, 'PUT', { membreId: m.id });
      } catch (er) { return toast(er.message, true); }
      fermer();
      // 3. rôle facultatif, une fois le membre dans le projet (il a maintenant une tâche)
      if (d.role) {
        try {
          await api('/api/Roles/attribuer', 'POST', { email: m.email, role: d.role, projetId: +d.projetId });
        } catch (er) {
          toast('Tâche affectée, mais rôle non attribué : ' + er.message, true);
          return recharger();
        }
      }
      toast(d.role ? 'Tâche affectée et rôle attribué' : 'Tâche affectée');
      recharger();
    };
    fen.querySelector('[data-cherche]').focus();
  };
}

/* ---------- Chargement et affichage ---------- */

// Fonction async exécutée tout de suite : données principales en une passe, puis affichage ;
// les commentaires sont chargés ensuite (squelette dans leur carte en attendant).
// Nommée afficherProfil : rappelée après une action de l'Admin (bloc « Gérer ce membre »).
const afficherProfil = async () => {
  const s = session();

  // membre.html?moi=1 (avatar de la barre du haut) : on retrouve sa fiche par son email.
  if (param('moi') != null)
    id = (await toutes('/api/Membres').catch(() => [])).find(x => norm(x.email) === norm(s?.name))?.id;

  // Le membre, par son id ; null s'il n'existe pas.
  const m = await api(`/api/Membres/${id}`).catch(() => null);
  if (!m) {
    view(`<div class="crumb"><a href="membres.html">Membres</a></div>
      ${emptyBox('👤', 'Membre introuvable')}
      <p style="text-align:center"><a class="plink" href="membres.html">← Retour aux membres</a></p>`);
    return;
  }

  const moi = norm(m.email) === norm(s?.name);   // le membre consulte son propre profil
  // compte sans fiche membre (retenu par majMessages) : pas de bouton « Envoyer un message »
  let sansFiche = false;
  // (l'Admin peut écrire à un membre : jamais « sans fiche » pour la messagerie)
  try { sansFiche = !s?.admin && sessionStorage.getItem('sansFiche:' + norm(s?.name)) === '1'; } catch {}
  const complet = !!s?.admin || moi;              // toutes ses tâches visibles

  // Rôles : liste des comptes si Admin (endpoint réservé à l'Admin), sa session sur son profil,
  // rien pour un collègue (aucun appel aux rôles).
  // Admin : aussi ses rôles par projet (affectations), pour le bloc « Gérer ce membre ».
  let roles = [], affectations = [];
  try {
    if (s?.admin) {
      const compte = list(await api('/api/Roles/utilisateurs')).find(u => norm(u.email) === norm(m.email));
      roles = compte?.roles || [];
      affectations = compte?.affectations || [];
    } else if (moi) roles = s.roles;
  } catch {}

  // Tâches visibles et noms des projets.
  let taches = [], projets = [];
  try {
    if (complet) {
      // Admin ou soi-même : l'endpoint des tâches du membre est autorisé.
      [taches, projets] = await Promise.all([
        toutes(`/api/membres/${id}/taches`),
        s.admin ? toutes('/api/Projets') : api('/api/projets/mes-projets').then(list)]);
    } else {
      // Collègue : mes projets (depuis MES tâches), puis les tâches de chacun de ces projets,
      // filtrées sur le collègue -> seulement ses tâches dans nos projets en commun.
      const [ms, mp] = await Promise.all([toutes('/api/Membres'), api('/api/projets/mes-projets')]);
      const monId = ms.find(x => norm(x.email) === norm(s?.name))?.id;
      const mesTaches = monId == null ? [] : await toutes(`/api/membres/${monId}/taches`);
      const mesProjets = [...new Set(mesTaches.map(t => t.projetId))];
      taches = (await Promise.all(mesProjets.map(p => toutes(`/api/projets/${p}/taches`))))
        .flat().filter(t => t.membreId === id);
      projets = list(mp);
    }
  } catch (e) {
    view(`<div class="crumb"><a href="membres.html">Membres</a> › ${esc(m.nom)}</div>
      ${emptyBox('⚠️', esc(e.message))}`);
    return;
  }
  const nomProjet = pid => projets.find(p => p.id === pid)?.nom || 'Projet ' + pid;

  // Chiffres : par statut et par projet.
  const nb = st => taches.filter(t => t.statut === st).length;
  const faites = nb('Terminee'), enCours = nb('EnCours'), aFaire = nb('AFaire');
  const ids = [...new Set(taches.map(t => t.projetId))];
  const avancement = taches.length ? Math.round(faites * 1000 / taches.length) / 10 : 0;

  // Sur son propre profil, l'email de la barre du haut mène aussi à ce profil.
  if (moi && $('#user .mail')) $('#user .mail').innerHTML = memberLink(m.id, esc(s.name));

  /* ----- En-tête : fiche + puces de chiffres ----- */

  const ariane = `<div class="crumb"><a href="membres.html">Membres</a> › ${esc(m.nom)}</div>`;
  // En-tête centré (classe profil-tete) : avatar, nom, email, rôles et chiffres en colonne.
  const fiche = (chiffres) => `<div class="detail-head profil-tete">
      ${icon(m.nom, true)}
      <div>
        <h1>${esc(m.nom)}${moi ? ' <span class="badge vous">Vous</span>' : ''}</h1>
        <p>${esc(m.email)}</p>
        ${roles.length ? `<div class="row" style="margin-top:8px">${roles.map(r =>
          `<span class="badge ${r === 'Admin' ? 'admin' : ''}">${esc(r)}</span>`).join('')}</div>` : ''}
        ${!moi && !sansFiche ? `<div class="row" style="margin-top:10px">
          <a class="btn primary small" href="messages.html?avec=${m.id}">Envoyer un message</a></div>` : ''}
        ${chiffres ? `<div class="row profil-puces">
          ${puce(taches.length, taches.length > 1 ? 'tâches' : 'tâche')}
          ${puce(faites, faites > 1 ? 'terminées' : 'terminée')}
          ${puce(enCours, 'en cours')}
          ${puce(aFaire, 'à faire')}
          ${puce(ids.length, (ids.length > 1 ? 'projets' : 'projet') + (complet ? '' : ' en commun'))}
        </div>` : ''}
      </div>
    </div>`;

  // Collègue sans projet en commun : la fiche et une seule ligne discrète.
  if (!complet && !taches.length) {
    view(`${ariane}<div class="profil-seul">${fiche(false)}</div>
      <div style="text-align:center">${discret('Aucun projet en commun avec ce membre')}</div>`);
    return;
  }

  /* ----- Page complète : tâches à gauche, cartes de synthèse à droite ----- */

  view(`${ariane}${fiche(true)}
    <div class="two" style="margin-top:20px">
      <div class="panel">
        <h3 style="margin-top:0">Tâches${complet ? '' : ' dans nos projets en commun'}</h3>
        <section class="col">
          ${bar('q', 'Rechercher par titre…')}
          <div class="frow" style="flex-wrap:wrap">
            <label class="fsel">
              <span>Projet</span>
              <select id="fP"><option value="">Tous</option>${ids.map(pid =>
                `<option value="${pid}">${esc(nomProjet(pid))}</option>`).join('')}</select>
            </label>
            <label class="fsel">
              <span>Statut</span>
              <select id="fS"><option value="">Tous</option>${Object.entries(STATUTS).map(([k, l]) =>
                `<option value="${k}">${l}</option>`).join('')}</select>
            </label>
          </div>
        </section>
        <div id="out"></div>
      </div>

      <div class="profil-cote">
        ${s?.admin ? `<div class="panel">
          <h3 style="margin-top:0">Gérer ce membre</h3>
          <div id="gestion">${skeleton(1)}</div>
        </div>` : ''}
        <div class="panel">
          <h3 style="margin-top:0">Avancement</h3>
          ${avHtml(pct(avancement))}
          <div class="meta" style="margin-top:10px"><span class="st AFaire">À faire</span><b>${aFaire}</b></div>
          <div class="meta" style="margin-top:6px"><span class="st EnCours">En cours</span><b>${enCours}</b></div>
          <div class="meta" style="margin-top:6px"><span class="st Terminee">Terminées</span><b>${faites}</b></div>
        </div>

        ${moi ? `<div class="panel">
          <h3 style="margin-top:0">Mes rôles et privilèges</h3>
          <div id="mesRoles">${skeleton(1)}</div>
        </div>` : ''}

        <div class="panel">
          <h3 style="margin-top:0">${complet ? 'Projets' : 'Projets en commun'} (${ids.length})</h3>
          <div id="projs"></div>
        </div>

        <div class="panel">
          <h3 style="margin-top:0">Derniers commentaires</h3>
          <div id="coms">${skeleton(1)}</div>
        </div>
      </div>
    </div>`);

  // Mon propre profil seulement (jamais celui d'un autre) : un bloc par projet où j'ai un rôle
  // (lien vers le projet), pastilles des rôles et libellés des privilèges.
  if (moi) mesDroits().then(d => {
    const entrees = Object.entries(d?.projets || {});
    $('#mesRoles').innerHTML = d?.admin ? htmlDroitsProjet(d)
      : !entrees.length ? '<p class="sub" style="margin:0">Vous n\'avez aucun privilège spécial</p>'
      : entrees.map(([pid, p]) => `<div class="droits-projet">
          <a href="projet.html?id=${pid}">${esc(p.projetNom)}</a>
          <div class="mes-droits">${htmlDroitsProjet(d, pid)}</div>
        </div>`).join('');
  });

  /* ----- Liste des tâches : filtres, recherche, pagination ----- */

  const draw = () => {
    const q = norm($('#q').value), p = $('#fP').value, st = $('#fS').value;
    const f = taches.filter(t => norm(t.titre).includes(q)
      && (!p || String(t.projetId) === p) && (!st || t.statut === st));
    const pages = Math.max(1, Math.ceil(f.length / SIZE));
    page = Math.min(page, pages);
    $('#out').innerHTML = !f.length
      ? discret(taches.length ? 'Aucun résultat' : "Ce membre n'a aucune tâche pour le moment.")
      : `<div class="grid">${f.slice((page - 1) * SIZE, page * SIZE).map(t => `
          <a class="card" href="tache.html?id=${t.id}">
            <div class="head">
              ${icon(t.titre)}
              <div>
                <h3>${esc(t.titre)}</h3>
                <span class="sub">${esc(nomProjet(t.projetId))}</span>
              </div>
            </div>
            <div class="meta">
              <span class="titulaire" style="margin:0">${gearStatut(t.statut)}
                <span class="st ${t.statut}">${STATUTS[t.statut] || esc(t.statut)}</span></span>
              <span>#${t.id}</span>
            </div>
          </a>`).join('')}</div>
        ${pages > 1 ? `<div class="pager">
          <button class="btn" id="prev" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
          <span>Page ${page} / ${pages}</span>
          <button class="btn" id="next" ${page >= pages ? 'disabled' : ''}>Suivant →</button>
        </div>` : ''}`;
    const pv = $('#prev'), nx = $('#next');
    if (pv) pv.onclick = () => { page--; draw(); };
    if (nx) nx.onclick = () => { page++; draw(); };
  };
  const filtre = () => { page = 1; draw(); };
  $('#q').oninput = $('#fP').onchange = $('#fS').onchange = filtre;
  draw();

  // Admin : bloc « Gérer ce membre » (une erreur s'affiche dans le bloc, sans casser la page).
  if (s?.admin) gererMembre({ m, ids, projets, affectations, recharger: () => afficherProfil().catch(e => toast(e.message, true)) })
    .catch(e => { if ($('#gestion')) $('#gestion').innerHTML = discret(esc(e.message)); });

  /* ----- Chargements secondaires (une passe chacun, en parallèle) ----- */

  // Carte « Projets » paginée par 6 (pagination commune) ; les barres reprennent
  // l'avancement déjà reçu (av), chargé une fois par projet, pas par carte.
  const av = {};
  let pageProjs = 1;
  const peindre = pid => {
    const b = $(`#projs [data-av="${pid}"]`);
    if (b && av[pid] != null) {
      b.firstElementChild.style.width = av[pid] + '%';
      if (av[pid] >= 100) b.classList.add('done');
    }
  };
  const rendreProjs = () => {
    const r = paginer(ids, 6, pageProjs);
    pageProjs = r.page;
    $('#projs').innerHTML = ids.length ? r.items.map(pid => {
      const n = taches.filter(t => t.projetId === pid).length;
      return `<a class="profil-projet" href="projet.html?id=${pid}">
          <div class="meta"><b>${esc(nomProjet(pid))}</b><span>${n} tâche${n > 1 ? 's' : ''}</span></div>
          <div class="bar" data-av="${pid}"><i></i></div>
        </a>`;
    }).join('') + r.html : discret('Aucun projet.');
    brancherPager($('#projs'), d => { pageProjs += d; rendreProjs(); });
    r.items.forEach(peindre);
  };
  rendreProjs();

  // Avancement de chaque projet (une requête par projet, pas par carte).
  ids.forEach(async pid => {
    av[pid] = await api(`/api/projets/${pid}/avancement`).then(pct).catch(() => null);
    peindre(pid);
  });

  // Derniers commentaires écrits par ce membre, dans ses 20 tâches visibles les plus récentes.
  const recentes = [...taches].sort((a, b) => b.id - a.id).slice(0, MAX_COMS);
  const parTache = await Promise.all(recentes.map(t =>
    toutes(`/api/taches/${t.id}/commentaires`).catch(() => [])));
  const titres = Object.fromEntries(taches.map(t => [t.id, t.titre]));
  const coms = parTache.flat().filter(c => c.membreId === id)
    .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)).slice(0, 5);
  $('#coms').innerHTML = coms.length ? coms.map(c => `
      <a class="profil-com" href="tache.html?id=${c.tacheId}">
        <div class="meta"><b>${esc(titres[c.tacheId] || 'Tâche ' + c.tacheId)}</b>
          <span>${new Date(c.dateCreation).toLocaleDateString('fr-FR')}</span></div>
        <div class="sub">${esc(c.contenu.length > 90 ? c.contenu.slice(0, 90) + '…' : c.contenu)}</div>
      </a>`).join('') : discret('Aucun commentaire.');
};
afficherProfil().catch(e => {
  view(`<div class="crumb"><a href="membres.html">Membres</a></div>${emptyBox('⚠️', esc(e.message))}`);
});
