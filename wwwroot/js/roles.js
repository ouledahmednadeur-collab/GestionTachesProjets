/* =====================================================================
 * roles.js : page de gestion des rôles (réservée à l'Admin)
 * Un bloc par rôle avec ses utilisateurs, filtrable par projet (un membre
 * appartient à un projet s'il y a au moins une tâche), un formulaire pour
 * attribuer un rôle à un membre choisi dans une liste et un formulaire
 * pour créer un rôle.
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

  // Ligne d'un utilisateur dans le bloc du rôle r. Bouton « Retirer » sauf pour le rôle
  // par défaut « Membre » et sauf pour le compte connecté.
  // Avatar et nom mènent au profil quand le compte a une fiche Membre (même email).
  const ligne = (u, r, mid = membres.find(x => x.email === u.email)?.id) => `<div class="line">
      ${memberLink(mid, icon(noms[u.email] || u.email))}
      <div class="txt">
        <b>${memberLink(mid, esc(noms[u.email] || u.email))}</b>
        ${noms[u.email] ? `<div class="sub">${esc(u.email)}</div>` : ''}
      </div>
      ${r !== 'Membre' && norm(u.email) !== norm(s.name)
        ? `<button class="btn small danger" data-email="${esc(u.email)}"
            data-role="${esc(r)}">Retirer</button>` : ''}
    </div>`;

  // Un bloc par rôle, filtré par projet, par la recherche de rôle et par la recherche de membre.
  // Filtre actif : les rôles sans résultat sont masqués ; sinon un rôle vide reste visible
  // (titre + « 0 utilisateur ») pour pouvoir lui attribuer des membres.
  // Page courante des utilisateurs de chaque bloc de rôle (pagination commune, 10 par page) :
  // conservée après une attribution ou un retrait, remise à 1 quand un filtre change.
  const pagesRoles = {};
  const pagesA1 = () => Object.keys(pagesRoles).forEach(k => delete pagesRoles[k]);

  const draw = () => {
    if (!roles) return;
    const qR = norm($('#qR').value), qU = norm($('#qU').value);
    const filtre = !!($('#fP').value || qR || qU);
    const duProjet = new Set(membresDuProjet().map(m => norm(m.email)));
    const visibles = $('#fP').value ? users.filter(u => duProjet.has(norm(u.email))) : users;
    const blocs = roles.filter(r => norm(r).includes(qR)).map(r => {
      const tous = visibles.filter(u => u.roles.includes(r));   // utilisateurs ayant ce rôle (filtre projet)
      const f = tous.filter(u => norm(u.email + ' ' + (noms[u.email] || '')).includes(qU));
      return { r, n: tous.length, f };
    }).filter(b => !filtre || b.f.length);
    $('#out').innerHTML = !roles.length ? emptyBox('🔑', 'Aucun rôle.')
      : !blocs.length ? '<p style="color:var(--muted);font-size:14px;margin:4px 0">Aucun résultat</p>'
      : blocs.map(b => `<div class="prow side-row">
          <div class="pside side-block">
            ${icon(b.r)}
            <b>${esc(b.r)}</b>
            ${b.r === 'Admin' ? '<span class="badge admin">Accès complet</span>' : ''}
            <span class="sub">${b.n} utilisateur${b.n > 1 ? 's' : ''}</span>
          </div>
          <div class="vsep"></div>
          <div class="pmain" data-bloc="${esc(b.r)}">${(pg => (pagesRoles[b.r] = pg.page,
            carreaux(pg.items, u => ligne(u, b.r)) + pg.html))(paginer(b.f, 10, pagesRoles[b.r]))}</div>
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

    const avantR = $('#selR').value, avantP = $('#fP').value;
    $('#selR').innerHTML = roles.map(r => `<option>${esc(r)}</option>`).join('');
    if (roles.includes(avantR)) $('#selR').value = avantR;
    ['#fP', '#selP'].forEach(sel => {
      $(sel).innerHTML = '<option value="">Tous les projets</option>'
        + ps.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
      $(sel).value = avantP;
    });
    draw();
  };

  // Rechargement après une modification ; une erreur s'affiche en toast.
  const actualiser = () => charger().catch(e => toast(e.message, true));

  /* ----- Événements ----- */

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
    confirmDo(`Retirer le rôle « ${role} » à ${email} ?`, async () => {
      try {
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
      await api('/api/Roles', 'POST', Object.fromEntries(new FormData(e.target)));
      toast('Rôle créé');
      e.target.reset();
      actualiser();
    } catch (er) {
      toast(er.message, true);
    }
  };

  // Attribution : seulement si une proposition de la liste a été choisie.
  $('#fa').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (!choisi) return toast('Choisissez un membre de la liste', true);
    try {
      await api('/api/Roles/attribuer', 'POST', { email: choisi, role: d.role });
      toast('Rôle attribué');
      viderMembre();
      actualiser();
    } catch (er) {
      toast(er.message, true);
    }
  };

  /* ----- Initialisation ----- */

  charger().catch(e => {
    toast(e.message, true);
    $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
  });
}

/* ---------- Initialisation ---------- */

load();
