/* Page d'un membre : ses tâches */
const id = +param('id');
view(`<div class="crumb"><a href="membres.html">Membres</a></div>${skeleton(3)}`);

(async () => {
  try {
    const ms = list(await api('/api/Membres'));
    const m = ms.find(x => x.id === id);
    if (!m) throw new Error('Membre introuvable');

    let items = [];
    try { items = list(await api(`/api/membres/${id}/taches?page=1&pageSize=50`)); }
    catch (e) {if (!/404|Not Found/i.test(e.message)) throw  e ;}

    view(`<div class="crumb"><a href="membres.html">Membres</a> › ${esc(m.nom)}</div>
      <div class="detail-head">${icon(m.nom, true)}<div><h1>${esc(m.nom)}</h1><p>${esc(m.email)}</p></div></div>
      <div class="sec"><h2>Tâches assignées (${items.length})</h2></div>
      ${items.length ? `<div class="grid">${items.map(x => `<a class="card" href="tache.html?id=${x.id}"><div class="head">${icon(x.titre)}<div><h3>${esc(x.titre)}</h3>
        <span class="st ${x.statut}">${STATUTS[x.statut] || x.statut}</span></div></div><div class="meta"><span>Projet ${x.projetId}</span><span>#${x.id}</span></div></a>`).join('')}</div>` : emptyBox('🗂️',"ce membre n a aucune tache pour le moment")}`);
  } catch (e) { view(`<div class="crumb"><a href="membres.html">Membres</a></div>${emptyBox('⚠️', esc(e.message))}`); }
})();