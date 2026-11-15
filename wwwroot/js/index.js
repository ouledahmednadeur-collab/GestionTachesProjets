/* Page d'accueil : liste des projets */
view(`<section class="hero"><h1>Gérez vos projets simplement</h1>
  <p>Suivez l'avancement, répartissez les tâches et échangez avec votre équipe.</p>
  <div class="search"><span>🔍</span><input id="q" placeholder="Rechercher un projet…" autocomplete="off"></div></section>
 <div class="sec"><h2>${session().admin ? 'Tous les projets' : 'Mes projets'}</h2><div class="actions">${session().admin ? '<button class="btn primary" id="newP">+ Nouveau projet</button>' : ''}</div></div>
  <div id="out">${skeleton(6)}</div>`);

let projets = [];
function draw(){
  const q = $('#q').value.trim().toLowerCase();
  const f = projets.filter(p => (p.nom + ' ' + (p.description || '')).toLowerCase().includes(q));
  $('#out').innerHTML = f.length ? `<div class="grid">${f.map(p => `
    <a class="card" href="projet.html?id=${p.id}">
      <div class="head">${icon(p.nom)}<div><h3>${esc(p.nom)}</h3><div class="sub">Projet n° ${p.id}</div></div></div>
      <div class="desc">${esc(p.description || 'Aucune description')}</div>
      <div><div class="bar" data-av="${p.id}"><i></i></div>
      <div class="meta" style="margin-top:6px"><span>Avancement</span><b data-avt="${p.id}">…</b></div></div>
    </a>`).join('')}</div>` : emptyBox('📁', 'Aucun projet trouvé.');
  f.forEach(async p => { try {
    const v = pct(await api(`/api/projets/${p.id}/avancement`));
    const b = $(`[data-av="${p.id}"]`); if (!b) return;
    b.firstElementChild.style.width = v + '%'; if (v >= 100) b.classList.add('done');
    $(`[data-avt="${p.id}"]`).textContent = v + ' %'; } catch {} });
}
$('#q').oninput = draw;
if ($('#newP')) $('#newP').onclick = () => modal('Nouveau projet', [
  { name: 'nom', label: 'Nom', required: true }, { name: 'description', label: 'Description', type: 'textarea' }],
  async d => { await api('/api/Projets', 'POST', d); toast('Projet créé'); location.reload(); });

api(session().admin ? '/api/Projets' : '/api/projets/mes-projets').then(d => { projets = list(d); draw(); })
  .catch(e => { $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); });