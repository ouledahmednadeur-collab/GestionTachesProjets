/* Page des membres */
async function load(){
  view(`<div class="sec"><h2>Membres de l'équipe</h2><div class="actions"><button class="btn primary" id="newM">+ Nouveau membre</button></div></div><div id="out">${skeleton(4)}</div>`);
  $('#newM').onclick = () => modal('Nouveau membre', [
    { name: 'nom', label: 'Nom', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }],
    async d => { await api('/api/Membres', 'POST', d); toast('Membre ajouté'); load(); });
  try {
    const ms = list(await api('/api/Membres')), s = session();
    $('#out').innerHTML = ms.length ? `<div class="grid">${ms.map(m => `
      <div class="card"><div class="head">${icon(m.nom)}<div><h3>${esc(m.nom)}</h3><div class="sub">${esc(m.email)}</div></div></div>
        <div class="row"><a class="btn small" href="membre.html?id=${m.id}">Voir ses tâches</a>
        ${s?.admin ? `<button class="btn small danger" data-del="${m.id}">Supprimer</button>` : ''}</div></div>`).join('')}</div>` : emptyBox('👥', 'Aucun membre.');
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmDo('Supprimer ce membre ?', async () => {
      try { await api(`/api/Membres/${b.dataset.del}`, 'DELETE'); toast('Membre supprimé'); load(); }
      catch (e) { toast(e.message, true); } }));
  } catch (e) { $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); }
}
load();
