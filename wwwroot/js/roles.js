/* Page de gestion des rôles (Admin) */
async function load(){
  const s = session();
  if (!s?.admin) { view(emptyBox('🔒', 'Page réservée aux administrateurs.')); return; }
  view(`<div class="sec"><h2>Gestion des rôles</h2></div><div id="out">${skeleton(2)}</div>`);
  try {
    const roles = list(await api('/api/Roles'));
    $('#out').innerHTML = `<div class="two"><div class="panel"><h3 style="margin-top:0">Rôles existants</h3>
      <div class="chips">${roles.map(r => `<span class="chip on">${esc(r)}</span>`).join('')}</div>
      <form id="fr" style="margin-top:18px"><label>Créer un rôle</label><div class="row"><input name="nom" placeholder="Nom du rôle" required style="flex:1"><button class="btn primary">Créer</button></div></form></div>
      <div class="panel"><h3 style="margin-top:0">Attribuer / retirer</h3><form id="fa">
        <label>Email de l'utilisateur</label><input name="email" type="email" required>
        <label>Rôle</label><select name="role">${roles.map(r => `<option>${esc(r)}</option>`).join('')}</select>
        <div class="row" style="margin-top:16px"><button class="btn primary">Attribuer</button><button type="button" class="btn danger" id="retirer">Retirer</button></div></form></div></div>`;
    $('#fr').onsubmit = async e => { e.preventDefault();
      try { await api('/api/Roles', 'POST', Object.fromEntries(new FormData(e.target))); toast('Rôle créé'); load(); }
      catch (er) { toast(er.message, true); } };
    const act = async a => { const d = Object.fromEntries(new FormData($('#fa')));
      if (!d.email) return toast('Email requis', true);
      try { await api(`/api/Roles/${a}`, 'POST', d); toast(a === 'attribuer' ? 'Rôle attribué' : 'Rôle retiré'); }
      catch (er) { toast(er.message, true); } };
    $('#fa').onsubmit = e => { e.preventDefault(); act('attribuer'); };
    $('#retirer').onclick = () => act('retirer');
  } catch (e) { $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); }
}
load();
