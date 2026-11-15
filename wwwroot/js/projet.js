/* Page d'un projet : infos, avancement, tâches filtrées et paginées */
const id = +param('id');
let statut = param('statut') || '';
let page = +param('page') || 1;
const SIZE = 6;

async function load(){
  view(`<div class="crumb"><a href="index.html">Projets</a> › Projet ${id}</div>${skeleton(3)}`);
  try {
    const [p, av, membres] = await Promise.all([
      api(`/api/Projets/${id}`), api(`/api/projets/${id}/avancement`).catch(() => 0), api('/api/Membres?page=1&pageSize=50').catch(() => [])]);
    const v = pct(av);
    const t = await api(`/api/projets/${id}/taches?page=${page}&pageSize=${SIZE}` + (statut ? `&statut=${statut}` : ''));
    const items = list(t), tot = total(t), pages = Math.max(1, Math.ceil(tot / SIZE));
    const nomMembre = x => esc(list(membres).find(m => m.id === x)?.nom || 'Membre ' + x);
    const s = session();
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

    document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { statut = b.dataset.s; page = 1; load(); });
    const pv = $('#prev'), nx = $('#next');
    if (pv) pv.onclick = () => { page--; load(); };
    if (nx) nx.onclick = () => { page++; load(); };
    $('#newT').onclick = () => modal('Nouvelle tâche', [
      { name: 'titre', label: 'Titre', required: true }, { name: 'description', label: 'Description', type: 'textarea' }],
      async d => { await api('/api/Taches', 'POST', {...d, projetId : id}); toast('Tache cree'); load(); });
    const dp = $('#delP');
    if (dp) dp.onclick = () => confirmDo('Supprimer ce projet et ses tâches ?', async () => {
      try { await api(`/api/Projets/${id}`, 'DELETE'); toast('Projet supprimé'); location.href = 'index.html'; }
      catch (e) { toast(e.message, true); } });
  } catch (e) { view(`<div class="crumb"><a href="index.html">Projets</a></div>${emptyBox('⚠️', esc(e.message))}`); }
}
load();
