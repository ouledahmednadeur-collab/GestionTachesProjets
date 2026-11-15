/* =====================================================================
 * tache.js : page d'une tâche (tache.html?id=…)
 * Affiche la tâche, permet de changer son statut, de l'affecter à un
 * membre, de la commenter et (Admin) de la supprimer.
 * ===================================================================== */

/* ---------- Constantes ---------- */

// Identifiant de la tâche lu dans l'URL (le + convertit le texte en nombre).
const id = +param('id');
let pageComs = 1;   // page courante des commentaires (10 par page)

/* ---------- Chargement, affichage et événements ---------- */

// Charge la tâche, les membres et les commentaires, puis dessine la page.
// Rappelée après chaque modification pour afficher l'état à jour.
async function load() {
  view(`<div class="crumb"><a href="index.html">Projets</a></div>${skeleton(2)}`);
  try {
    // Chargement des données : les 3 appels partent en parallèle.
    // Membres et commentaires sont facultatifs (liste vide en cas d'erreur).
    const [t, membres, coms] = await Promise.all([
      api(`/api/Taches/${id}`),
      api('/api/Membres?page=1&pageSize=50').catch(() => []),
      api(`/api/taches/${id}/commentaires`).catch(() => [])]);
    const ms = list(membres), cs = list(coms), s = session();

    // Options d'une liste de membres, sel = membre présélectionné.
    const opts = sel => ms.map(m =>
      `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.nom)}</option>`).join('');

    // Id du membre connecté (par son email) : un membre ne supprime que ses commentaires.
    const moiId = ms.find(m => norm(m.email) === norm(s?.name))?.id;

    // Titulaire de la tâche (membre affecté) ou undefined si la tâche n'est pas affectée.
    const titulaire = ms.find(m => m.id === t.membreId);
    // Nom affiché : celui renvoyé par l'API, sinon celui de la liste des membres déjà chargée.
    const nomTitulaire = t.membreNom || titulaire?.nom;

    // Panneau « Gestion » : seulement pour l'Admin ou le titulaire de la tâche.
    // Simple confort d'interface : la sécurité réelle est faite par le backend
    // (PUT /api/Taches/{id}/statut renvoie 403 pour la tâche d'un autre membre).
    const gere = s?.admin || (moiId != null && t.membreId === moiId);

    // Petit engrenage (forme du logo) dont la vitesse dépend du statut de la TÂCHE :
    // arrêté si Terminée, lent si À faire, rapide si En cours (classes gear--…).
    const engrenage = gearStatut(t.statut);   // fonction partagée (common.js)

    // Affichage : fil d'Ariane, en-tête, commentaires (à gauche), gestion (à droite).
    view(`<div class="crumb">
        <a href="index.html">Projets</a>
        › <a href="projet.html?id=${t.projetId}">Projet ${t.projetId}</a>
        › ${esc(t.titre)}
      </div>

      <div class="detail-head">
        ${icon(t.titre, true)}
        <div style="flex:1">
          <h1>${esc(t.titre)}</h1>
          <span class="st ${t.statut}">${STATUTS[t.statut] || t.statut}</span>
          <span class="titulaire">${engrenage}${titulaire
            ? `Titulaire : <b>${memberLink(titulaire.id, esc(titulaire.nom))}</b>` : 'Non affectée'}</span>
          <p style="margin-top:10px">${esc(t.description || 'Pas de description')}</p>
        </div>
        ${s?.admin ? '<button class="btn danger" id="delT">Supprimer</button>' : ''}
      </div>

      <div class="two" style="margin-top:20px">
        <div class="panel">
          <h3 style="margin-top:0">Commentaires (${cs.length})</h3>
          <div id="listeComs"></div>
          <form id="fc" style="margin-top:14px">
            <label>Écrire un commentaire</label>
            <textarea name="contenu" rows="2" required></textarea>
            <div class="row" style="margin-top:10px">
              <select name="membreId" style="max-width:200px" title="Auteur du commentaire">
                ${opts(ms.find(m => m.email === s?.name)?.id)}
              </select>
              <button class="btn primary">Publier</button>
            </div>
          </form>
        </div>

        ${gere ? `<div class="panel panel-tache">
          <h3 style="margin-top:0">Gestion</h3>
          <!-- statut et membre agrandis, centrés dans la carte -->
          <div class="pt-centre">
            <div class="pt-bloc">
              <label class="pt-label" for="stSel">Statut</label>
              <div class="pt-statut">${engrenage}<span class="st ${t.statut}">${STATUTS[t.statut] || t.statut}</span></div>
              <select id="stSel">
                ${Object.entries(STATUTS).map(([k, l]) =>
                  `<option value="${k}" ${k === t.statut ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <hr class="pt-sep">
            <div class="pt-bloc">
              <label class="pt-label"${s?.admin ? ' for="afSel"' : ''}>Assignée à</label>
              ${s?.admin ? `${renderMembre(nomTitulaire, t.membreRole, '', t.membreId)}
              <select id="afSel">
                <option value="">— Choisir —</option>
                ${opts(t.membreId)}
              </select>` : renderMembre(nomTitulaire, t.membreRole,
                t.membreId === moiId ? ' <span class="badge vous">Vous</span>' : '', t.membreId)}
            </div>
            <button class="btn primary pt-save" id="save">Enregistrer</button>
          </div>
        </div>` : `<div class="panel panel-tache">
          <h3 style="margin-top:0">Tâche</h3>
          <!-- lecture seule : statut et membre agrandis, centrés dans la carte -->
          <div class="pt-centre">
            <div class="pt-bloc">
              <span class="pt-label">Statut</span>
              <div class="pt-statut">${engrenage}<span class="st ${t.statut}">${STATUTS[t.statut] || t.statut}</span></div>
            </div>
            <hr class="pt-sep">
            <div class="pt-bloc">
              <span class="pt-label">Assignée à</span>
              ${renderMembre(nomTitulaire, t.membreRole, '', t.membreId)}
            </div>
          </div>
        </div>`}
      </div>`);

    /* ----- Événements ----- */

    // Bouton « Enregistrer » : changement de statut, puis affectation éventuelle.
    // Branché seulement si le panneau « Gestion » est affiché (sinon #save n'existe pas).
    if ($('#save')) $('#save').onclick = async () => {
      try {
        // 1. Lecture de la valeur choisie dans la liste #stSel :
        //    'AFaire', 'EnCours' ou 'Terminee' (les clés de STATUTS, noms de l'enum C#).
        // 2. Requête PUT /api/Taches/{id}/statut,
        //    corps JSON : { "statut": "<valeur>" } ;
        //    api() ajoute Content-Type: application/json et le token Bearer.
        // 3. Si le serveur refuse (400, 403, 404…), api() lève une erreur
        //    -> catch -> toast rouge.
        await api(`/api/Taches/${id}/statut`, 'PUT', { statut: $('#stSel').value });

        // Affectation seulement si un membre est choisi :
        // PUT /api/Taches/{id}/affecter avec { membreId }.
        const m = $('#afSel')?.value;
        if (m && session().admin) await api(`/api/Taches/${id}/affecter`, 'PUT', { membreId: +m });

        // 4. Succès : message, puis load() recharge la tâche et redessine la page.
        //    L'avancement du projet n'est pas stocké : le serveur le recalcule à partir
        //    des statuts, il sera donc à jour sur les pages projet et accueil.
        toast('Tâche mise à jour');
        load();
      } catch (e) {
        toast(e.message, true);
      }
    };

    // Formulaire de commentaire : POST du contenu et de l'auteur choisi, puis rechargement.
    $('#fc').onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      try {
        await api(`/api/taches/${id}/commentaires`, 'POST',
          { contenu: d.contenu, membreId: +d.membreId });
        toast('Commentaire ajouté');
        load();
      } catch (er) {
        toast(er.message, true);
      }
    };

    // Suppression d'un commentaire (Admin, ou auteur du commentaire), puis rechargement.
    // Commentaires paginés par 10 (pagination commune) ; pageComs est hors de load()
    // pour garder la page courante quand la page se recharge après une suppression.
    const comHtml = c => `
            <div class="com">
              ${renderMembre(ms.find(m => m.id === c.membreId)?.nom || 'Membre ' + c.membreId, null,
                ` <small>· ${new Date(c.dateCreation).toLocaleString('fr-FR')}</small>`, c.membreId)}
              <div>${esc(c.contenu)}</div>
              ${s?.admin || (moiId != null && c.membreId === moiId)
                ? `<button class="btn danger" data-delc="${c.id}">Supprimer</button>` : ''}
            </div>`;
    const brancherSuppressions = () =>
      document.querySelectorAll('[data-delc]').forEach(b => b.onclick = () =>
        confirmDo('Supprimer ce commentaire ?', async () => {
          try {
            await api(`/api/Commentaires/${b.dataset.delc}`, 'DELETE');
            toast('Commentaire supprimé');
            load();
          } catch (e) {
            toast(e.message, true);
          }
        }));
    const rendreComs = () => {
      const r = paginer(cs, 10, pageComs);
      pageComs = r.page;
      $('#listeComs').innerHTML = cs.length ? r.items.map(comHtml).join('') + r.html
        : '<p style="color:var(--muted)">Aucun commentaire.</p>';
      brancherPager($('#listeComs'), d => { pageComs += d; rendreComs(); });
      brancherSuppressions();
    };
    rendreComs();

    // Suppression (bouton visible seulement pour l'Admin), puis retour au projet.
    const dt = $('#delT');
    if (dt) dt.onclick = () => confirmDo('Supprimer cette tâche ?', async () => {
      try {
        await api(`/api/Taches/${id}`, 'DELETE');
        toast('Tâche supprimée');
        location.href = `projet.html?id=${t.projetId}`;
      } catch (e) {
        toast(e.message, true);
      }
    });
  } catch (e) {
    // Tâche introuvable ou accès refusé : message à la place de la page.
    view(emptyBox('⚠️', esc(e.message)));
  }
}

/* ---------- Initialisation ---------- */

load();
