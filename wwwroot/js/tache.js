/* Page d'une tâche : statut, affectation, commentaires */
const id = +param('id');

async function load(){
  view(`<div class="crumb"><a href="index.html">Projets</a></div>${skeleton(2)}`);
  try {
    const [t, membres, coms] = await Promise.all([
      api(`/api/Taches/${id}`), api('/api/Membres?page=1&pageSize=50').catch(() => []), api(`/api/taches/${id}/commentaires`).catch(() => [])]);
    const ms = list(membres), cs = list(coms), s = session();
    const opts = sel => ms.map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.nom)}</option>`).join('');
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

    $('#save').onclick = async () => { try {
      await api(`/api/Taches/${id}/statut`, 'PUT', { statut: $('#stSel').value });
      const m = $('#afSel').value; if (m) await api(`/api/Taches/${id}/affecter`, 'PUT', { membreId: +m });
      toast('Tâche mise à jour'); load(); } catch (e) { toast(e.message, true); } };
    $('#fc').onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
      try { await api(`/api/taches/${id}/commentaires`, 'POST', { contenu: d.contenu, membreId: +d.membreId }); toast('Commentaire ajouté'); load(); }
      catch (er) { toast(er.message, true); } };
    const dt = $('#delT');
    if (dt) dt.onclick = () => confirmDo('Supprimer cette tâche ?', async () => {
      try { await api(`/api/Taches/${id}`, 'DELETE'); toast('Tâche supprimée'); location.href = `projet.html?id=${t.projetId}`; }
      catch (e) { toast(e.message, true); } });
  } catch (e) { view(emptyBox('⚠️', esc(e.message))); }
}
load();
