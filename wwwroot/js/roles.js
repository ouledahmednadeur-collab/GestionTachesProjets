/* Page de gestion des rôles (Admin) */
async function load(){
  const s = session();
  if (!s?.admin) { view(emptyBox('🔒', 'Page réservée aux administrateurs.')); return; }
  view(`<div class="sec"><h2>Gestion des rôles</h2></div>
    <div class="two">
      <section class="col"><div class="searches">${bar('qR', 'Rechercher un rôle…')}${bar('qU', 'Rechercher un membre…')}</div>
        <div id="out">${skeleton(2)}</div></section>
      <div>
        <div class="panel"><h3 style="margin-top:0">Attribuer / retirer</h3><form id="fa">
          <label>Email de l'utilisateur</label><input name="email" type="email" required>
          <label>Rôle</label><select name="role" id="selR"></select>
          <div class="row" style="margin-top:16px"><button class="btn primary">Attribuer</button><button type="button" class="btn danger" id="retirer">Retirer</button></div></form></div>
        <div class="panel" style="margin-top:16px"><form id="fr"><label style="margin-top:0">Créer un rôle</label>
          <div class="row"><input name="nom" placeholder="Nom du rôle" required style="flex:1"><button class="btn primary">Créer</button></div></form></div>
      </div>
    </div>`);

  let roles = null, users = [], noms = {};   // roles = null : pas encore chargé
  const ligne = (u, r) => `<div class="line">${icon(noms[u.email] || u.email)}
      <div class="txt"><b>${esc(noms[u.email] || u.email)}</b>${noms[u.email] ? `<div class="sub">${esc(u.email)}</div>` : ''}</div>
      <button class="btn small danger" data-email="${esc(u.email)}" data-role="${esc(r)}">Retirer</button>
    </div>`;
  const draw = () => {
    if (!roles) return;
    const qR = norm($('#qR').value), qU = norm($('#qU').value);
    const blocs = roles.filter(r => norm(r).includes(qR)).map(r => {
      const tous = users.filter(u => u.roles.includes(r));                       // utilisateurs ayant ce rôle
      const f = tous.filter(u => norm(u.email + ' ' + (noms[u.email] || '')).includes(qU));
      return { r, n: tous.length, f };
    }).filter(b => !qU || b.f.length);                                           // recherche membre : on masque les blocs vides
    $('#out').innerHTML = !roles.length ? emptyBox('🔑', 'Aucun rôle.')
      : !blocs.length ? emptyBox('🔍', 'Aucun rôle ne correspond à votre recherche.')
      : blocs.map(b => `<div class="prow">
          <div class="pside">${icon(b.r)}<b>${esc(b.r)}</b>
            ${b.r === 'Admin' ? '<span class="badge admin">Accès complet</span>' : ''}
            <span class="sub">${b.n} utilisateur${b.n > 1 ? 's' : ''}</span></div>
          <div class="vsep"></div>
          <div class="pmain">${b.f.length ? carreaux(b.f, u => ligne(u, b.r)) : tile(emptyBox('👤', 'Aucun utilisateur pour ce rôle.'))}</div>
        </div>`).join('');
  };
  /* charge rôles + utilisateurs (+ noms des membres), remplit la liste du formulaire, redessine */
  const charger = async () => {
    const [rs, us, ms] = await Promise.all([api('/api/Roles'), api('/api/Roles/utilisateurs'),
      api('/api/Membres?page=1&pageSize=50').catch(() => [])]);
    noms = {}; list(ms).forEach(m => { noms[m.email] = m.nom; });
    users = list(us); roles = list(rs);
    const avant = $('#selR').value;
    $('#selR').innerHTML = roles.map(r => `<option>${esc(r)}</option>`).join('');
    if (roles.includes(avant)) $('#selR').value = avant;
    draw();
  };
  const actualiser = () => charger().catch(e => toast(e.message, true));
  $('#qR').oninput = $('#qU').oninput = draw;

  /* bouton « Retirer » de chaque utilisateur (délégation : marche aussi après un redessin) */
  $('#out').onclick = e => {
    const b = e.target.closest('[data-role]'); if (!b) return;
    const { email, role } = b.dataset;
    const moi = email.toLowerCase() === s.name.toLowerCase() && role === 'Admin';
    confirmDo(moi ? 'Retirer VOTRE propre rôle Admin ? Vous perdrez l\'accès à cette page.' : `Retirer le rôle « ${role} » à ${email} ?`, async () => {
      try { await api('/api/Roles/retirer', 'DELETE', { email, role }); toast('Rôle retiré'); actualiser(); }
      catch (er) { toast(er.message, true); } });
  };

  $('#fr').onsubmit = async e => { e.preventDefault();
    try { await api('/api/Roles', 'POST', Object.fromEntries(new FormData(e.target))); toast('Rôle créé'); e.target.reset(); actualiser(); }
    catch (er) { toast(er.message, true); } };
  const act = async a => { const d = Object.fromEntries(new FormData($('#fa')));
    if (!d.email) return toast('Email requis', true);
    try { await api(`/api/Roles/${a}`, a === 'attribuer' ? 'POST' : 'DELETE', d); toast(a === 'attribuer' ? 'Rôle attribué' : 'Rôle retiré'); actualiser(); }
    catch (er) { toast(er.message, true); } };
  $('#fa').onsubmit = e => { e.preventDefault(); act('attribuer'); };
  $('#retirer').onclick = () => act('retirer');

  charger().catch(e => { toast(e.message, true); $('#out').innerHTML = emptyBox('⚠️', esc(e.message)); });
}
load();
