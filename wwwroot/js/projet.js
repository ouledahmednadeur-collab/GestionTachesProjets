/* =====================================================================
 * projet.js : page d'un projet (projet.html?id=…)
 * Infos du projet, barre d'avancement, tâches filtrées par statut
 * et paginées côté serveur.
 * ===================================================================== */

/* ---------- Constantes et état de la page ---------- */

const id = +param('id');                 // identifiant du projet lu dans l'URL
let statut = param('statut') || '';     // filtre de statut ('' = toutes les tâches)
let page = +param('page') || 1;         // page courante de la liste des tâches
const SIZE = PAGE_SIZE;                  // nombre de tâches par page (constante commune)

// Chargés UNE seule fois pour la page (promesses gardées), même si load() est rappelée :
// mes projets (pour savoir si je suis membre de celui-ci) et les tâches du projet (pour la
// liste d'affectation de la fenêtre « Nouvelle tâche »).
let mesProjetsPromesse = null, tachesProjetPromesse = null;
const mesProjets = () => mesProjetsPromesse ||= api('/api/projets/mes-projets').catch(() => []);
const tachesDuProjet = () => tachesProjetPromesse ||= toutes(`/api/projets/${id}/taches`).catch(() => []);

// Ligne discrète sous la barre d'avancement : mon rôle et mes privilèges dans CE projet.
// Admin : une mention ; membre avec rôle : pastilles des rôles puis des privilèges (description
// au survol) ; membre sans rôle : « aucun privilège spécial » ; non-membre : rien.
const ligneDroits = (droits, membreDuProjet) => {
  if (droits.admin) return '<span class="role-pill admin">Administrateur : tous les privilèges sur ce projet</span>';
  const dp = droitsProjet(droits, id);
  if (dp.roles.length) return `<span class="sub">Votre rôle :</span>
    ${dp.roles.map(r => `<span class="role-pill metier">${esc(r)}</span>`).join('')}
    ${dp.privileges.length ? `<span class="sub">Privilèges :</span>
      ${dp.privileges.map(x => `<span class="priv-libelle" title="${esc(x.description)}">${esc(x.libelle)}</span>`).join('')}` : ''}`;
  return membreDuProjet ? '<span class="sub">Membre du projet : aucun privilège spécial</span>' : '';
};

/* ---------- Chargement, affichage et événements ---------- */

// Charge le projet, son avancement et la page de tâches demandée, puis dessine tout.
// Rappelée à chaque changement de filtre ou de page et après chaque modification.
async function load() {
  view(`<div class="crumb"><a href="index.html">Projets</a> › Projet ${id}</div>${skeleton(3)}`);
  try {
    // Chargement des données : projet, avancement et membres en parallèle
    // (avancement et membres facultatifs : valeur par défaut en cas d'erreur).
    // Droits : chargés une seule fois pour la page (mesDroits() garde la réponse en cache).
    // Si le chargement des droits échoue, mesDroits() renvoie « aucun droit » : pas de bouton.
    const [p, av, membres, droits, projetsDeMoi] = await Promise.all([
      api(`/api/Projets/${id}`),
      api(`/api/projets/${id}/avancement`).catch(() => 0),
      api('/api/Membres?page=1&pageSize=50').catch(() => []),
      mesDroits(),
      session()?.admin ? [] : mesProjets()]);
    const membreDuProjet = list(projetsDeMoi).some(x => x.id === id);
    // « + Nouvelle tâche » : seulement pour l'Admin ou avec « taches.creer » dans CE projet.
    // Masquer le bouton n'est qu'un confort d'interface : la sécurité réelle est faite par le
    // backend (POST /api/Taches renvoie 403 sans ce privilège).
    const peutCreer = peut(p.id, 'taches.creer');
    // liste d'affectation de la fenêtre : Admin ou « taches.affecter » dans ce projet
    const peutAffecter = peut(p.id, 'taches.affecter');
    const v = pct(av);

    // Tâches de la page courante, filtrées par statut si un filtre est choisi.
    const t = await api(`/api/projets/${id}/taches?page=${page}&pageSize=${SIZE}`
      + (statut ? `&statut=${statut}` : ''));
    const items = list(t), tot = total(t), pages = Math.max(1, Math.ceil(tot / SIZE));
    const nomMembre = x => esc(list(membres).find(m => m.id === x)?.nom || 'Membre ' + x);
    const s = session();

    // Affichage : en-tête avec avancement, filtres, cartes des tâches, pagination.
    view(`<div class="crumb">
        <a href="index.html">Projets</a> › ${esc(p.nom)}
      </div>

      <div class="detail-head">
        ${icon(p.nom, true)}
        <div style="flex:1;min-width:220px">
          <h1>${esc(p.nom)}</h1>
          <button type="button" class="role-pill membre" id="mesPrivs">Mes privilèges dans ce projet</button>
          <p>${esc(p.description || 'Aucune description')}</p>
          <div style="max-width:380px;margin-top:14px">
            <div class="bar ${v >= 100 ? 'done' : ''}"><i style="width:${v}%"></i></div>
            <div class="meta" style="margin-top:6px">
              <span>Avancement du projet</span>
              <b>${v} %</b>
            </div>
          </div>
          <div class="mes-droits" id="mesDroits" style="margin-top:12px">${ligneDroits(droits, membreDuProjet)}</div>
        </div>
        <div class="row">
          ${peutCreer ? '<button class="btn primary" id="newT">+ Nouvelle tâche</button>' : ''}
          ${s?.admin ? '<button class="btn danger" id="delP">Supprimer</button>' : ''}
        </div>
      </div>

      <div class="sec">
        <h2>Tâches <span style="color:var(--muted);font-weight:500">(${tot})</span></h2>
        <div class="chips">
          ${[['', 'Toutes'], ['AFaire', 'À faire'], ['EnCours', 'En cours'],
            ['Terminee', 'Terminées']].map(([k, l]) =>
              `<button class="chip ${statut === k ? 'on' : ''}"
                data-s="${k}">${l}</button>`).join('')}
        </div>
      </div>

      ${items.length ? `<div class="grid">${items.map(x => `
        <a class="card" href="tache.html?id=${x.id}">
          <div class="head">
            ${icon(x.titre)}
            <div>
              <h3>${esc(x.titre)}</h3>
              <span class="st ${x.statut}">${STATUTS[x.statut] || x.statut}</span>
            </div>
          </div>
          <div class="desc">${esc(x.description || 'Pas de description')}</div>
          <div class="meta">
            <span>${x.membreId ? memberLink(x.membreId, '👤 ' + nomMembre(x.membreId), true) : 'Non assignée'}</span>
            <span>#${x.id}</span>
          </div>
        </a>`).join('')}</div>` : emptyBox('✅', 'Aucune tâche pour ce filtre.')}

      ${pages > 1 ? `<div class="pager">
        <button class="btn" id="prev" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
        <span>Page ${page} / ${pages}</span>
        <button class="btn" id="next" ${page >= pages ? 'disabled' : ''}>Suivant →</button>
      </div>` : ''}`);

    /* ----- Événements ----- */

    // Filtres de statut : on revient à la page 1 et on recharge.
    document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      statut = b.dataset.s;
      page = 1;
      load();
    });

    // Pagination : boutons présents seulement s'il y a plusieurs pages.
    const pv = $('#prev'), nx = $('#next');
    if (pv) pv.onclick = () => { page--; load(); };
    if (nx) nx.onclick = () => { page++; load(); };

    // Nouvelle tâche dans ce projet (le projetId est ajouté aux champs du formulaire).
    // Liste « Assignée à » seulement pour l'Admin ou avec « taches.affecter » dans ce projet,
    // limitée aux membres du projet ; sinon pas de liste (tâche créée sans titulaire).
    // L'API de création ne prend pas de membre : l'affectation se fait juste après, par
    // PUT /api/Taches/{id}/affecter (le backend revérifie le privilège).
    $('#mesPrivs').onclick = () => panneauPrivileges(p.id);   // panneau filtré sur ce projet

    const nt = $('#newT');
    if (nt) nt.onclick = async () => {
      const champs = [
        { name: 'titre', label: 'Titre', required: true },
        { name: 'description', label: 'Description', type: 'textarea' }];
      if (peutAffecter) {
        const ids = new Set((await tachesDuProjet()).map(x => x.membreId).filter(x => x != null));
        champs.push({ name: 'membreId', label: 'Assignée à', type: 'select', value: '',
          options: [{ value: '', label: '— Non affectée —' }].concat(list(membres)
            .filter(m => ids.has(m.id)).map(m => ({ value: m.id, label: m.nom }))) });
      }
      modal('Nouvelle tâche', champs, async ({ membreId, ...d }) => {
        let cree;
        try {
          cree = await api('/api/Taches', 'POST', { ...d, projetId: id });
        } catch (er) {
          if (er.status !== 403) throw er;   // autres erreurs : message du serveur, fenêtre ouverte
          toast('Vous n\'avez pas le droit de créer une tâche dans ce projet', true);
          return load();                     // 403 : la fenêtre se ferme, page à jour
        }
        if (membreId) {
          try {
            await api(`/api/Taches/${cree.id}/affecter`, 'PUT', { membreId: +membreId });
          } catch (er) {
            toast('Tâche créée, mais non affectée : ' + er.message, true);
            return load();
          }
        }
        toast('Tache cree');
        load();
      });
    };

    // Suppression du projet (Admin), puis retour à l'accueil.
    const dp = $('#delP');
    if (dp) dp.onclick = () => confirmDo('Supprimer ce projet et ses tâches ?', async () => {
      try {
        await api(`/api/Projets/${id}`, 'DELETE');
        toast('Projet supprimé');
        location.href = 'index.html';
      } catch (e) {
        toast(e.message, true);
      }
    });
  } catch (e) {
    // Projet introuvable ou accès refusé.
    view(`<div class="crumb"><a href="index.html">Projets</a></div>
      ${emptyBox('⚠️', esc(e.message))}`);
  }
}

/* ---------- Initialisation ---------- */

load();
