/* =====================================================================
 * roles.js : page de gestion des rôles (réservée à l'Admin)
 * Un bloc par rôle avec ses utilisateurs, filtrable par projet (un membre
 * appartient à un projet s'il y a au moins une tâche), un formulaire pour
 * attribuer un rôle à un membre choisi dans une liste et un formulaire
 * pour créer un rôle. Un rôle porteur de privilèges s'attribue PAR PROJET
 * (Admin et Membre restent globaux).
 * ===================================================================== */

/* ---------- Chargement, affichage et événements ---------- */

// Construit la page ; un non-admin ne voit qu'un message (le serveur refuse de toute façon).
async function load() {
  const s = session();
  if (!s?.admin) { view(emptyBox('🔒', 'Page réservée aux administrateurs.')); return; }

  // Liste déroulante de projets (même contenu pour le filtre et le formulaire).
  const choixProjet = id => `<select id="${id}"><option value="">Tous les projets</option></select>`;

  // Structure fixe : recherches + filtre projet et blocs des rôles à gauche, formulaires à droite.
  view(`<div class="sec"><h2>Gestion des rôles</h2></div>
    <div class="two">
      <section class="col">
        <div class="searches">
          ${bar('qR', 'Rechercher un rôle…')}
          ${bar('qU', 'Rechercher un membre…')}
        </div>
        <div class="frow">
          <label class="fsel"><span>Projet</span>${choixProjet('fP')}</label>
        </div>
        <div id="out">${skeleton(2)}</div>
      </section>

      <div>
        <div class="panel">
          <h3 style="margin-top:0">Attribuer un rôle</h3>
          <form id="fa">
            <label>Projet</label>
            ${choixProjet('selP')}
            <label>Membre</label>
            <div class="combo">
              <input id="mIn" placeholder="Nom ou email…" autocomplete="off"
                role="combobox" aria-expanded="false" aria-controls="mList">
              <ul class="combo-list" id="mList" role="listbox" hidden></ul>
            </div>
            <label>Rôle</label>
            <select name="role" id="selR"></select>
            <p class="sub" id="aideR" style="margin:6px 0 0"></p>
            <div class="row" style="margin-top:16px">
              <button class="btn primary">Attribuer</button>
            </div>
          </form>
        </div>

        <div class="panel" style="margin-top:16px">
          <form id="fr">
            <label style="margin-top:0">Créer un rôle</label>
            <div class="row">
              <input name="nom" placeholder="Nom du rôle" required style="flex:1">
              <button class="btn primary">Créer</button>
            </div>
            <!-- privilèges accordés dès la création (cases remplies avec le catalogue) -->
            <details class="priv-creation" id="privCreation">
              <summary>Privilèges (optionnel)</summary>
              <div id="privCreationCases"></div>
            </details>
          </form>
        </div>
      </div>
    </div>`);

  /* ----- État ----- */

  // roles = null : pas encore chargé ; noms = nom du membre par email (pour l'affichage) ;
  // membres = fiches Membre ; taches = toutes les tâches (pour savoir qui est dans quel projet).
  let roles = null, users = [], noms = {}, membres = [], taches = [];

  /* ----- Filtre projet ----- */

  // Membres du projet choisi (tous si « Tous les projets ») : au moins une tâche dans ce projet.
  const membresDuProjet = () => {
    const p = $('#fP').value;
    if (!p) return membres;
    const ids = new Set(taches.filter(t => String(t.projetId) === p).map(t => t.membreId));
    return membres.filter(m => ids.has(m.id));
  };

  /* ----- Champ « Membre » : liste déroulante filtrable (combobox) ----- */

  // choisi = email du membre sélectionné (null tant qu'aucune proposition n'est choisie) ;
  // props = propositions affichées ; actif = proposition surlignée au clavier (-1 = aucune).
  let choisi = null, props = [], actif = -1;
  const etiquette = m => `${m.nom} · ${m.email}`;

  // Affiche la liste des propositions sous le champ.
  const afficherListe = () => {
    $('#mList').innerHTML = props.length
      ? props.map((m, i) => `<li role="option" data-i="${i}"
          class="${i === actif ? 'on' : ''}">${esc(etiquette(m))}</li>`).join('')
      : '<li class="vide">Aucun membre</li>';
    $('#mList').hidden = false;
    $('#mIn').setAttribute('aria-expanded', 'true');
    $('#mList .on')?.scrollIntoView({ block: 'nearest' });
  };

  // Ouvre la liste : membres du projet choisi, filtrés par le texte q (nom ou email).
  const ouvrir = (q = '') => {
    props = membresDuProjet().filter(m => norm(m.nom + ' ' + m.email).includes(norm(q)));
    actif = -1;
    afficherListe();
  };

  const fermer = () => {
    $('#mList').hidden = true;
    $('#mIn').setAttribute('aria-expanded', 'false');
  };

  // Choix d'une proposition : remplit le champ et mémorise l'email.
  const choisir = i => {
    const m = props[i];
    if (!m) return;
    $('#mIn').value = etiquette(m);
    choisi = m.email;
    fermer();
  };

  // Changement de projet : le champ est vidé (les propositions sont recalculées à l'ouverture).
  const viderMembre = () => {
    $('#mIn').value = '';
    choisi = null;
    fermer();
  };

  /* ----- Rendu ----- */

  // Ligne d'une attribution du rôle r : e = { u, projetId, projetNom } (projetId absent pour une
  // attribution globale). Une attribution par projet affiche la pastille du projet ; une
  // attribution globale d'un rôle à privilèges est signalée « global : sans effet » (à réaffecter
  // par projet). Bouton « Retirer » sauf pour le rôle par défaut « Membre » et sauf pour le compte
  // connecté. Avatar et nom mènent au profil quand le compte a une fiche Membre (même email).
  const ligne = (e, r, u = e.u, mid = membres.find(x => x.email === u.email)?.id) => `<div class="line">
      ${memberLink(mid, icon(noms[u.email] || u.email))}
      <div class="txt">
        <b>${memberLink(mid, esc(noms[u.email] || u.email))}</b>
        ${noms[u.email] ? `<div class="sub">${esc(u.email)}</div>` : ''}
        ${e.projetId != null
          ? `<span class="role-pill membre role-projet" title="${esc(e.projetNom)}">${esc(e.projetNom)}</span>`
          : aPrivileges(r) ? '<span class="role-pill admin" title="Rôle à privilèges attribué sans projet : aucun effet, à réaffecter par projet">global : sans effet</span>' : ''}
      </div>
      ${r !== 'Membre' && norm(u.email) !== norm(s.name)
        ? `<button class="btn small danger" data-email="${esc(u.email)}"
            data-role="${esc(r)}" data-projet="${e.projetId ?? ''}">Retirer</button>` : ''}
    </div>`;

  // Un bloc par rôle. Le filtre projet ne masque jamais un rôle (rôle sans membre dans le projet :
  // une ligne compacte) ; seules les recherches masquent : nom de rôle, ou membre (rôle sans
  // membre correspondant). Sans filtre, un rôle vide reste visible avec « 0 utilisateur ».
  // Page courante des utilisateurs de chaque bloc de rôle (pagination commune, 10 par page) :
  // conservée après une attribution ou un retrait, remise à 1 quand un filtre change.
  const pagesRoles = {};
  const pagesA1 = () => Object.keys(pagesRoles).forEach(k => delete pagesRoles[k]);

  /* ----- Privilèges des rôles ----- */

  // catalogue : [{ cle, libelle, description }] ; privRoles : clés accordées, par rôle
  let catalogue = [], privRoles = {};
  const libelle = cle => catalogue.find(p => p.cle === cle)?.libelle || cle;
  // rôle porteur d'au moins un privilège : il s'attribue obligatoirement dans un projet
  const aPrivileges = r => (privRoles[r] || []).length > 0;

  // Pastilles du bloc d'un rôle : Admin = tous les privilèges ; Membre = rien (rôle par défaut) ;
  // autre rôle = ses privilèges + bouton « Privilèges » (page réservée à l'Admin).
  const pastillesPrivileges = r => r === 'Admin' ? '<span class="role-pill admin">Tous les privilèges</span>'
    : r === 'Membre' ? ''
    : `<div class="priv-pills">${(privRoles[r] || []).map(k =>
        `<span class="role-pill metier">${esc(libelle(k))}</span>`).join('') || '<span class="sub">Aucun privilège</span>'}</div>
      <button class="btn small" type="button" data-priv="${esc(r)}">Privilèges</button>`;

  // Fenêtre des privilèges d'un rôle (même rendu que la fenêtre modal() existante) :
  // une case par privilège du catalogue, état actuel coché, puis PUT de la liste complète.
  const ouvrirPrivileges = r => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<form class="box">
        <h3>Privilèges du rôle « ${esc(r)} »</h3>
        ${catalogue.map(p => `<label class="priv-case">
            <input type="checkbox" name="p" value="${esc(p.cle)}" ${(privRoles[r] || []).includes(p.cle) ? 'checked' : ''}>
            <span><b>${esc(p.libelle)}</b><span class="sub">${esc(p.description)}</span></span>
          </label>`).join('')}
        <p class="sub" style="margin:10px 0 0">S'appliquent seulement dans les projets où ce rôle est attribué au membre.</p>
        <div class="foot">
          <button type="button" class="btn" data-x>Annuler</button>
          <button class="btn primary">Enregistrer</button>
        </div>
      </form>`;
    document.body.appendChild(m);
    const fermer = () => m.remove();
    m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-x')) fermer(); });
    m.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const privileges = [...e.target.querySelectorAll('input[name=p]:checked')].map(x => x.value);
      try {
        await api(`/api/Roles/${encodeURIComponent(r)}/privileges`, 'PUT', { privileges });
        toast('Privilèges enregistrés');
        fermer();
        actualiser();
      } catch (er) {
        toast(er.message, true);
      }
    };
  };

  const draw = () => {
    if (!roles) return;
    const qR = norm($('#qR').value), qU = norm($('#qU').value);
    const projet = $('#fP').value;
    const duProjet = new Set(membresDuProjet().map(m => norm(m.email)));
    const visibles = projet ? users.filter(u => duProjet.has(norm(u.email))) : users;
    const blocs = roles.filter(r => norm(r).includes(qR)).map(r => {
      // attributions de ce rôle : globales (membres du projet filtré), puis par projet
      // (seulement celles du projet filtré, s'il y en a un)
      const tous = visibles.filter(u => u.roles.includes(r)).map(u => ({ u }))
        .concat(users.flatMap(u => (u.affectations || [])
          .filter(a => a.role === r && (!projet || String(a.projetId) === projet))
          .map(a => ({ u, projetId: a.projetId, projetNom: a.projetNom }))));
      const f = tous.filter(e => norm(e.u.email + ' ' + (noms[e.u.email] || '')).includes(qU));
      return { r, n: tous.length, f };
    // un rôle n'est masqué que par les recherches : nom de rôle (ci-dessus), ou membre
    // (rôle sans membre correspondant) ; le filtre projet ne fait jamais disparaître un rôle
    }).filter(b => !qU || b.f.length);
    $('#out').innerHTML = !roles.length ? emptyBox('🔑', 'Aucun rôle.')
      : !blocs.length ? '<p style="color:var(--muted);font-size:14px;margin:4px 0">Aucun résultat</p>'
      : blocs.map(b => projet && !b.n
        // projet choisi et aucun membre de ce rôle dans le projet : version compacte, une ligne
        ? `<div class="role-compact">
            ${icon(b.r)}
            <b>${esc(b.r)}</b>
            <span class="sub">0 attribution dans ce projet</span>
            ${pastillesPrivileges(b.r)}
          </div>`
        : `<div class="prow side-row">
          <div class="pside side-block">
            ${icon(b.r)}
            <b>${esc(b.r)}</b>
            ${b.r === 'Admin' ? '<span class="badge admin">Accès complet</span>' : ''}
            <span class="sub">${b.n} attribution${b.n > 1 ? 's' : ''}</span>
            ${pastillesPrivileges(b.r)}
          </div>
          <div class="vsep"></div>
          <div class="pmain" data-bloc="${esc(b.r)}">${(pg => (pagesRoles[b.r] = pg.page,
            carreaux(pg.items, u => ligne(u, b.r)) + pg.html))(paginer(b.f, PAGE_SIZE, pagesRoles[b.r]))}</div>
        </div>`).join('');
    document.querySelectorAll('#out [data-bloc]').forEach(z =>
      brancherPager(z, d => { pagesRoles[z.dataset.bloc] += d; draw(); }));
  };

  /* ----- Chargement des données ----- */

  // Charge rôles + utilisateurs + membres + projets et leurs tâches (toutes les pages),
  // remplit les listes en gardant les choix déjà faits, puis redessine.
  const charger = async () => {
    const [rs, us, ms, ps] = await Promise.all([
      api('/api/Roles'),
      api('/api/Roles/utilisateurs'),
      toutes('/api/Membres').catch(() => []),
      toutes('/api/Projets')]);
    taches = (await Promise.all(ps.map(p => toutes(`/api/projets/${p.id}/taches`)))).flat();
    membres = ms;
    noms = {};
    membres.forEach(m => { noms[m.email] = m.nom; });
    users = list(us);
    roles = list(rs);
    // privilèges : catalogue + clés accordées à chaque rôle délégable (pas Admin ni Membre)
    catalogue = await api('/api/Roles/privileges');
    if (!$('#privCreationCases').children.length)
      $('#privCreationCases').innerHTML = catalogue.map(p => `<label class="priv-case">
          <input type="checkbox" name="priv" value="${esc(p.cle)}">
          <span><b>${esc(p.libelle)}</b><span class="sub">${esc(p.description)}</span></span>
        </label>`).join('');
    const delegables = roles.filter(r => r !== 'Admin' && r !== 'Membre');
    const cles = await Promise.all(delegables.map(r =>
      api(`/api/Roles/${encodeURIComponent(r)}/privileges`).catch(() => [])));
    privRoles = {};
    delegables.forEach((r, i) => { privRoles[r] = cles[i]; });

    const avantR = $('#selR').value, avantP = $('#fP').value;
    // value = nom exact du rôle (sans value, le navigateur enverrait le texte sans ses espaces)
    $('#selR').innerHTML = roles.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
    if (roles.includes(avantR)) $('#selR').value = avantR;
    aideRole();
    ['#fP', '#selP'].forEach(sel => {
      $(sel).innerHTML = '<option value="">Tous les projets</option>'
        + ps.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
      $(sel).value = avantP;
    });
    draw();
  };

  // Rechargement après une modification ; une erreur s'affiche en toast.
  const actualiser = () => charger().catch(e => toast(e.message, true));

  // Aide sous la liste « Rôle » : projet obligatoire pour un rôle à privilèges.
  const aideRole = () => {
    const r = $('#selR').value;
    $('#aideR').textContent = r === 'Admin' || r === 'Membre' ? 'Rôle global (sans projet).'
      : aPrivileges(r) ? 'Rôle à privilèges : il s\'attribue dans un projet, choisissez-le ci-dessus.'
      : 'Rôle sans privilège : global, ou limité au projet choisi.';
  };

  /* ----- Événements ----- */

  $('#selR').onchange = aideRole;

  $('#qR').oninput = $('#qU').oninput = () => { pagesA1(); draw(); };

  // Filtre projet : les deux listes restent synchronisées (filtre et formulaire).
  const changerProjet = v => {
    $('#fP').value = $('#selP').value = v;
    viderMembre();
    pagesA1();
    draw();
  };
  $('#fP').onchange = () => changerProjet($('#fP').value);
  $('#selP').onchange = () => changerProjet($('#selP').value);

  // Combobox : un clic ou le focus ouvre toute la liste ; la saisie filtre en direct
  // (et annule le choix précédent) ; flèches, Entrée et Échap au clavier.
  $('#mIn').onfocus = $('#mIn').onclick = () => { if ($('#mList').hidden) ouvrir(); };
  $('#mIn').oninput = () => { choisi = null; ouvrir($('#mIn').value); };
  $('#mIn').onkeydown = e => {
    const ouverte = !$('#mList').hidden;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!ouverte) return ouvrir();
      if (!props.length) return;
      actif = e.key === 'ArrowDown' ? Math.min(actif + 1, props.length - 1) : Math.max(actif - 1, 0);
      afficherListe();
    } else if (e.key === 'Enter' && ouverte && actif >= 0) {
      e.preventDefault();   // choisit la proposition au lieu d'envoyer le formulaire
      choisir(actif);
    } else if (e.key === 'Escape') {
      fermer();
    }
  };
  // mousedown (et non click) : le choix se fait avant que le champ perde le focus.
  $('#mList').onmousedown = e => {
    e.preventDefault();
    const li = e.target.closest('[data-i]');
    if (li) choisir(+li.dataset.i);
  };
  // Clic en dehors du champ et de sa liste : fermeture.
  document.addEventListener('click', e => { if (!e.target.closest('.combo')) fermer(); });
  // Tabulation vers un autre champ : fermeture aussi.
  $('#mIn').onblur = fermer;

  // Bouton « Retirer » de chaque utilisateur (délégation : marche aussi après un redessin).
  // Le backend ne redonne pas de rôle : si l'utilisateur n'en a plus, on lui attribue « Membre ».
  $('#out').onclick = e => {
    const b = e.target.closest('[data-role]');
    if (!b) return;
    const { email, role } = b.dataset;
    const projetId = b.dataset.projet ? +b.dataset.projet : null;   // attribution par projet
    const nomProjet = projetId == null ? ''
      : ` dans « ${users.flatMap(u => u.affectations || []).find(a => a.projetId === projetId)?.projetNom || 'ce projet'} »`;
    confirmDo(`Retirer le rôle « ${role} » à ${email}${nomProjet} ?`, async () => {
      try {
        if (projetId != null) {
          // retrait de l'affectation de ce projet seulement : les rôles globaux ne changent pas
          await api('/api/Roles/retirer', 'DELETE', { email, role, projetId });
          toast('Rôle retiré de ce projet');
          return actualiser();
        }
        await api('/api/Roles/retirer', 'DELETE', { email, role });
        const u = users.find(x => x.email === email);
        if (!(u?.roles || []).some(r => r !== role))
          await api('/api/Roles/attribuer', 'POST', { email, role: 'Membre' });
        toast('Rôle retiré');
        actualiser();
      } catch (er) {
        toast(er.message, true);
      }
    });
  };

  // Création d'un rôle.
  $('#fr').onsubmit = async e => {
    e.preventDefault();
    try {
      const privileges = [...e.target.querySelectorAll('input[name=priv]:checked')].map(x => x.value);
      await api('/api/Roles', 'POST', { nom: e.target.nom.value.trim(), privileges });
      toast('Rôle créé');
      e.target.reset();
      $('#privCreation').open = false;
      actualiser();   // le nouveau rôle apparaît tout de suite (liste de gauche et liste « Rôle »)
    } catch (er) {
      toast(er.message, true);
    }
  };

  // Attribution : seulement si une proposition de la liste a été choisie.
  $('#fa').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const projet = $('#selP').value;
    if (aPrivileges(d.role) && !projet) return toast('Choisissez un projet pour ce rôle', true);
    if (!choisi) return toast('Choisissez un membre de la liste', true);
    // Admin et Membre : toujours globaux ; autre rôle : par projet si un projet est choisi
    const global = d.role === 'Admin' || d.role === 'Membre' || !projet;
    try {
      await api('/api/Roles/attribuer', 'POST',
        global ? { email: choisi, role: d.role } : { email: choisi, role: d.role, projetId: +projet });
      toast('Rôle attribué');
      viderMembre();
      actualiser();
    } catch (er) {
      toast(er.message, true);
    }
  };

  // Bouton « Privilèges » d'un bloc de rôle.
  $('#out').addEventListener('click', e => {
    const b = e.target.closest('[data-priv]');
    if (b) ouvrirPrivileges(b.dataset.priv);
  });

  /* ----- Initialisation ----- */

  charger().catch(e => {
    toast(e.message, true);
    $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
  });
}

/* ---------- Initialisation ---------- */

load();
