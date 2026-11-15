/* =====================================================================
 * projet.js : page d'un projet (projet.html?id=…)
 * Infos du projet, barre d'avancement, tâches filtrées par statut
 * et paginées côté serveur.
 * ===================================================================== */

/* ---------- Constantes et état de la page ---------- */

const id = +param('id');                 // identifiant du projet lu dans l'URL
let statut = param('statut') || '';     // filtre de statut ('' = toutes les tâches)
let page = +param('page') || 1;         // page courante de la liste des tâches
const SIZE = 6;                          // nombre de tâches par page

/* ---------- Chargement, affichage et événements ---------- */

// Charge le projet, son avancement et la page de tâches demandée, puis dessine tout.
// Rappelée à chaque changement de filtre ou de page et après chaque modification.
async function load() {
  view(`<div class="crumb"><a href="index.html">Projets</a> › Projet ${id}</div>${skeleton(3)}`);
  try {
    // Chargement des données : projet, avancement et membres en parallèle
    // (avancement et membres facultatifs : valeur par défaut en cas d'erreur).
    const [p, av, membres] = await Promise.all([
      api(`/api/Projets/${id}`),
      api(`/api/projets/${id}/avancement`).catch(() => 0),
      api('/api/Membres?page=1&pageSize=50').catch(() => [])]);
    const v = pct(av);

    // Tâches de la page courante, filtrées par statut si un filtre est choisi.
    const t = await api(`/api/projets/${id}/taches?page=${page}&pageSize=${SIZE}`
      + (statut ? `&statut=${statut}` : ''));
    const items = list(t), tot = total(t), pages = Math.max(1, Math.ceil(tot / SIZE));
    const nomMembre = x => esc(list(membres).find(m => m.id === x)?.nom || 'Membre ' + x);
    const s = session();

    // Affichage : en-tête avec avancement, filtres, cartes des tâches, pagination.
    view(`<div class="crumb"><a href="index.html">Projets</a> › ${esc(p.nom)}</div>
      <div class="detail-head">${icon(p.nom, true)}<div style="flex:1;min-width:220px"><h1>${esc(p.nom)}</h1><p>${esc(p.description || 'Aucune description')}</p>
        <div style="max-width:380px;margin-top:14px"><div class="bar ${v >= 100 ? 'done' : ''}"><i style="width:${v}%"></i></div>
        <div class="meta" style="margin-top:6px"><span>Avancement du projet</span><b>${v} %</b></div></div></div>
        <div class="row"><button class="btn primary" id="newT">+ Nouvelle tâche</button>
        ${s?.admin ? '<button class="btn danger" id="delP">Supprimer</button>' : ''}</div></div>
      <div class="sec"><h2>Tâches <span style="color:var(--muted);font-weight:500">(${tot})</span></h2>
        <div class="chips">${[['', 'Toutes'], ['AFaire', 'À faire'], ['EnCours', 'En cours'], ['Terminee', 'Terminées']].map(([k, l]) =>
          `<button class="chip ${statut === k ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div></div>
      ${items.length ? `<div class="grid">${items.map(x => `
        <a class="card" href="tache.html?id=${x.id}">
          <div class="head">${icon(x.titre)}<div><h3>${esc(x.titre)}</h3><span class="st ${x.statut}">${STATUTS[x.statut] || x.statut}</span></div></div>
          <div class="desc">${esc(x.description || 'Pas de description')}</div>
          <div class="meta"><span>${x.membreId ? '👤 ' + nomMembre(x.membreId) : 'Non assignée'}</span><span>#${x.id}</span></div>
        </a>`).join('')}</div>` : emptyBox('✅', 'Aucune tâche pour ce filtre.')}
      ${pages > 1 ? `<div class="pager"><button class="btn" id="prev" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
        <span>Page ${page} / ${pages}</span><button class="btn" id="next" ${page >= pages ? 'disabled' : ''}>Suivant →</button></div>` : ''}`);

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
    $('#newT').onclick = () => modal('Nouvelle tâche', [
      { name: 'titre', label: 'Titre', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }],
      async d => {
        await api('/api/Taches', 'POST', { ...d, projetId: id });
        toast('Tache cree');
        load();
      });

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
    view(`<div class="crumb"><a href="index.html">Projets</a></div>${emptyBox('⚠️', esc(e.message))}`);
  }
}

/* ---------- Initialisation ---------- */

load();
