/* Page de connexion / inscription */
let mode = 'login';
function draw(){
  view(`<div class="auth panel"><div class="tabs"><button class="${mode === 'login' ? 'on' : ''}" data-m="login">Connexion</button><button class="${mode === 'register' ? 'on' : ''}" data-m="register">Inscription</button></div>
    <form id="f">${mode === 'register' ? '<label>Nom</label><input name ="nom" required>':''}<label>Email</label><input name="email" type="email" required autocomplete="username" value="${mode === 'login' ? 'admin@test.com' : ''}">
      <label>Mot de passe</label><input name="password" type="password" required autocomplete="current-password" value="${mode === 'login' ? 'Admin123!' : ''}">
      <button class="btn primary" style="width:100%;margin-top:20px">${mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button></form>
    <p style="color:var(--muted);font-size:13px;margin:16px 0 0">Compte de démonstration : admin@test.com / Admin123!</p></div>`);
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
  $('#f').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try {
      if (mode === 'register') { await api('/api/Auth/register', 'POST', d); toast('Compte créé, connexion…'); }
      const r = await api('/api/Auth/login', 'POST', d);
      const tk = r.token ?? r.Token ?? r.accessToken; if (!tk) throw new Error('Réponse sans token');
      store.set('token', tk); location.href = 'index.html';
    } catch (er) { toast(er.message, true); }
  };
}
draw();
