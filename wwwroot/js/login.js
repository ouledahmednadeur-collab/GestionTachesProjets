/* =====================================================================
 * login.js : page de connexion / inscription
 * Un seul formulaire qui bascule entre les deux modes ; après succès,
 * le token JWT est rangé dans localStorage puis on va à l'accueil.
 * ===================================================================== */

/* ---------- État de la page ---------- */

// mode : 'login' ou 'register' ; premier : premier affichage (animation d'apparition de la carte).
let mode = 'login', premier = true;

/* ---------- Affichage et événements ---------- */

// Dessine la carte selon le mode courant et branche ses événements.
// Rappelée à chaque changement d'onglet (Connexion / Inscription).
function draw() {
  const reg = mode === 'register';
  view(`<div class="auth panel auth-card${premier ? ' appear' : ''}">
    <div class="auth-head">
      <span class="logo">✓</span>
      <h1>Bienvenue</h1>
      <p>Connectez-vous pour gérer vos projets et vos tâches</p>
    </div>

    <div class="tabs">
      <button class="${mode === 'login' ? 'on' : ''}" data-m="login">Connexion</button>
      <button class="${mode === 'register' ? 'on' : ''}" data-m="register">Inscription</button>
    </div>

    <form id="f">
      ${reg ? '<label>Nom</label><div class="field"><span>👤</span><input name ="nom" required></div>' : ''}
      <label>Email</label>
      <div class="field">
        <span>✉️</span>
        <input name="email" type="email" required autocomplete="username"
          value="${mode === 'login' ? 'admin@test.com' : ''}">
      </div>
      <label>Mot de passe</label>
      <div class="field">
        <span>🔒</span>
        <input name="password" type="password" required autocomplete="current-password"
          value="${mode === 'login' ? 'Admin123!' : ''}">
      </div>
      <button class="btn primary" style="width:100%;margin-top:20px">${
        mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
    </form>

    <p class="ferr" id="ferr" role="alert"></p>
    <p class="switch">${reg ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
      <button type="button" class="linkbtn" data-m="${reg ? 'login' : 'register'}">${
        reg ? 'Se connecter' : 'Créer un compte'}</button>
    </p>
    <p style="color:var(--muted);font-size:13px;margin:16px 0 0;text-align:center">Compte de démonstration : admin@test.com / Admin123!</p>
  </div>`);
  premier = false;

  // Onglets et lien du bas : changent de mode puis redessinent.
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    mode = b.dataset.m;
    draw();
  });

  // Envoi du formulaire : inscription éventuelle, puis connexion pour obtenir le token.
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    $('#ferr').textContent = '';
    try {
      if (mode === 'register') {
        await api('/api/Auth/register', 'POST', d);
        toast('Compte créé, connexion…');
      }
      const r = await api('/api/Auth/login', 'POST', d);
      // Le nom de la propriété du token peut varier selon le backend.
      const tk = r.token ?? r.Token ?? r.accessToken;
      if (!tk) throw new Error('Réponse sans token');
      store.set('token', tk);
      location.href = 'index.html';
    } catch (er) {
      toast(er.message, true);
      $('#ferr').textContent = er.message;
    }
  };
}

/* ---------- Initialisation ---------- */

draw();
