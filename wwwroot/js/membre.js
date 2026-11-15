/* =====================================================================
 * membre.js : page d'un membre (membre.html?id=…)
 * Affiche le membre et la liste des tâches qui lui sont assignées.
 * ===================================================================== */

/* ---------- Constantes ---------- */

const id = +param('id');   // identifiant du membre lu dans l'URL

/* ---------- Initialisation : squelette pendant le chargement ---------- */

view(`<div class="crumb"><a href="membres.html">Membres</a></div>${skeleton(3)}`);

/* ---------- Chargement et affichage ---------- */

// Fonction async exécutée tout de suite (pas besoin de la rappeler : la page ne modifie rien).
(async () => {
  try {
    // Le membre, par son id ; null s'il n'existe pas ou n'est pas accessible.
    const m = await api(`/api/Membres/${id}`).catch(() => null);
    if (!m) throw new Error('Membre introuvable');

    // Ses tâches ; un 404 veut dire « aucune tâche », les autres erreurs remontent.
    let items = [];
    try {
      items = list(await api(`/api/membres/${id}/taches?page=1&pageSize=50`));
    } catch (e) {
      if (!/404|Not Found/i.test(e.message)) throw e;
    }

    // Affichage : en-tête du membre puis cartes de ses tâches.
    view(`<div class="crumb">
        <a href="membres.html">Membres</a> › ${esc(m.nom)}
      </div>

      <div class="detail-head">
        ${icon(m.nom, true)}
        <div>
          <h1>${esc(m.nom)}</h1>
          <p>${esc(m.email)}</p>
        </div>
      </div>

      <div class="sec">
        <h2>Tâches assignées (${items.length})</h2>
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
          <div class="meta">
            <span>Projet ${x.projetId}</span>
            <span>#${x.id}</span>
          </div>
        </a>`).join('')}</div>`
        : emptyBox('🗂️', "ce membre n a aucune tache pour le moment")}`);
  } catch (e) {
    view(`<div class="crumb"><a href="membres.html">Membres</a></div>
      ${emptyBox('⚠️', esc(e.message))}`);
  }
})();
