/* =====================================================================
 * tache.js : page d'une tâche (tache.html?id=…)
 * Affiche la tâche, permet de changer son statut, de l'affecter à un
 * membre, de la commenter et (Admin) de la supprimer.
 * ===================================================================== */

/* ---------- Constantes ---------- */

// Identifiant de la tâche lu dans l'URL (le + convertit le texte en nombre).
const id = +param('id');

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

    // Affichage : fil d'Ariane, en-tête, commentaires (à gauche), gestion (à droite).
    view(`<div class="crumb"><a href="index.html">Projets</a> › <a href="projet.html?id=${t.projetId}">Projet ${t.projetId}</a> › ${esc(t.titre)}</div>
      <div class="detail-head">${icon(t.titre, true)}<div style="flex:1"><h1>${esc(t.titre)}</h1><span class="st ${t.statut}">${STATUTS[t.statut] || t.statut}</span>
        <p style="margin-top:10px">${esc(t.description || 'Pas de description')}</p></div>
        ${s?.admin ? '<button class="btn danger" id="delT">Supprimer</button>' : ''}</div>
      <div class="two" style="margin-top:20px">
        <div class="panel"><h3 style="margin-top:0">Commentaires (${cs.length})</h3>
          ${cs.length ? cs.map(c => `<div class="com"><small>${esc(ms.find(m => m.id === c.membreId)?.nom || 'Membre ' + c.membreId)} · ${new Date(c.dateCreation).toLocaleString('fr-FR')}</small><div>${esc(c.contenu)}</div></div>`).join('') : '<p style="color:var(--muted)">Aucun commentaire.</p>'}
          <form id="fc" style="margin-top:14px"><label>Écrire un commentaire</label><textarea name="contenu" rows="2" required></textarea>
            <div class="row" style="margin-top:10px"><select name="membreId" style="max-width:200px" title="Auteur du commentaire">${opts(ms.find(m => m.email === s?.name)?.id)}</select><button class="btn primary">Publier</button></div></form></div>
        <div class="panel"><h3 style="margin-top:0">Gestion</h3>
          <label>Statut</label><select id="stSel">${Object.entries(STATUTS).map(([k, l]) => `<option value="${k}" ${k === t.statut ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <label>Assignée à</label><select id="afSel"><option value="">— Choisir —</option>${opts(t.membreId)}</select>
          <button class="btn primary" id="save" style="margin-top:16px;width:100%">Enregistrer</button></div>
      </div>`);

    /* ----- Événements ----- */

    // Bouton « Enregistrer » : changement de statut, puis affectation éventuelle.
    $('#save').onclick = async () => {
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
        const m = $('#afSel').value;
        if (m) await api(`/api/Taches/${id}/affecter`, 'PUT', { membreId: +m });

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
