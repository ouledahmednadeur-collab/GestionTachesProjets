/* =====================================================================
 * login.js : page de connexion / inscription
 * Un seul formulaire qui bascule entre les deux modes ; après succès,
 * le token JWT est rangé dans localStorage puis on va à l'accueil.
 * ===================================================================== */

/* ---------- État de la page ---------- */

// mode : 'user' (onglet Utilisateur), 'admin' (onglet Administrateur) ou 'register' (inscription) ;
// premier : premier affichage (animation d'apparition de la carte).
let mode = 'user', premier = true;

// Saisies propres à chaque vue : changer d'onglet ne mélange pas les champs.
// Valeurs de départ = comptes de démonstration du README.
const saisies = {
  user: { email: 'nadeur@test.com', password: 'Nadeur1234!' },
  admin: { email: 'admin@test.com', password: 'Admin123!' },
  register: { nom: '', email: '', password: '' }
};

// Texte de chaque vue : bouton d'envoi et compte de démonstration.
const VUES = {
  user: { bouton: 'Se connecter', demo: 'nadeur@test.com / Nadeur1234!' },
  admin: { bouton: 'Se connecter en administrateur', demo: 'admin@test.com / Admin123!' },
  register: { bouton: 'Créer mon compte', demo: '' }
};

/* ---------- Grand engrenage Admin (zone de gauche) ---------- */

// Anneau denté (28 dents) qui tourne lentement ; au centre, un administrateur fixe :
// costume, chemise, cravate, et un écusson doré coché (signe « Admin »).
function adminGear() {
  const anneau = `<path class="gl-ring" fill-rule="evenodd" d="${gearPath(28, 5, 54)}"/>`;
  return `<div class="admin-hero">
      <svg class="admin-gear" viewBox="-80 -80 160 160" aria-hidden="true">
        <g class="gl-spin cw" style="--d:24s">
          <g class="gl-boost cw" style="--d:48s">${anneau}</g>
        </g>
        <circle class="gl-fond" r="54"/>
        <path class="gl-corps" d="M-42.5 30C-40 14-26 10-12 9H12C26 10 40 14 42.5 30A52 52 0 0 1-42.5 30Z"/>
        <path class="gl-fond" d="M-12 9H12L0 33Z"/>
        <path class="gl-casque" d="M-4 9.5H4L3 15H-3ZM-3 15H3L5 29 0 34-5 29Z"/>
        <rect class="gl-corps" x="-6.5" y="2" width="13" height="9" rx="3"/>
        <g transform="translate(0 5)">
          <circle class="gl-corps" cy="-14" r="15"/>
          <path class="gl-cheveux" d="M-15.5-13C-17-28-4-33 6-30 13-28 16.5-22 15.5-13 11-20 2-22-6-20-11-19-14-17-15.5-13Z"/>
        </g>
        <path class="gl-ecusson" d="M38 24 50 29V38C50 46 44 51 38 53 32 51 26 46 26 38V29Z"/>
        <path class="gl-arete" fill="none" d="M32.5 38.5 36.5 42.5 44 34.5"/>
      </svg>
      <b>Administrateur</b>
      <span>Pilote les projets, les membres et les rôles</span>
    </div>`;
}

/* ---------- Affichage et événements ---------- */

// Dessine la carte selon le mode courant et branche ses événements.
// Rappelée à chaque changement de vue (Utilisateur / Administrateur / Inscription).
function draw() {
  const reg = mode === 'register', v = VUES[mode], d = saisies[mode];
  const html = `${adminGear()}<div class="auth panel auth-card${premier ? ' appear' : ''}">
    <div class="auth-head">
      ${gearLogo(true)}
      <h1>Bienvenue</h1>
      <p>Connectez-vous pour gérer vos projets et vos tâches</p>
    </div>

    <div class="tabs">
      <button class="${mode === 'user' ? 'on' : ''}" data-m="user">Utilisateur</button>
      <button class="${mode === 'admin' ? 'on' : ''}" data-m="admin">Administrateur</button>
    </div>

    <form id="f">
      ${reg ? `<label>Nom</label><div class="field"><span>👤</span><input name ="nom" required
        value="${esc(d.nom)}"></div>` : ''}
      <label>Email</label>
      <div class="field">
        <span>✉️</span>
        <input name="email" type="email" required autocomplete="username" value="${esc(d.email)}">
      </div>
      <label>Mot de passe</label>
      <div class="field">
        <span>🔒</span>
        <input name="password" type="password" required autocomplete="current-password"
          value="${esc(d.password)}">
      </div>
      <button class="btn primary" style="width:100%;margin-top:20px">${v.bouton}</button>
    </form>

    <p class="ferr" id="ferr" role="alert"></p>
    ${mode === 'admin' ? '' : `<p class="switch">${reg ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
      <button type="button" class="linkbtn" data-m="${reg ? 'user' : 'register'}">${
        reg ? 'Se connecter' : 'Créer un compte'}</button>
    </p>`}
    ${v.demo ? `<p style="color:var(--muted);font-size:13px;margin:16px 0 0;text-align:center">Compte de démonstration : ${v.demo}</p>` : ''}
  </div>`;
  const tete = $('.auth-head');
  if (!tete) view(html);
  else {
    // Changement d'onglet : l'en-tête (et ses engrenages en rotation) reste en place,
    // seul le reste de la carte est remplacé, pour que l'animation ne reparte pas de zéro.
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const neuf = tmp.querySelector('.auth-head');
    while (tete.nextSibling) tete.nextSibling.remove();
    while (neuf.nextSibling) tete.parentNode.append(neuf.nextSibling);
  }
  premier = false;

  // Chaque saisie est gardée dans la vue courante (restaurée au retour sur cet onglet).
  $('#f').oninput = e => { saisies[mode][e.target.name] = e.target.value; };

  // Onglets et lien du bas : changent de vue puis redessinent.
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    if (b.dataset.m === 'register') return ouvrirInscription();
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

      // Type de compte attendu selon l'onglet, lu avec session().admin.
      // Simple confort d'interface : la sécurité réelle reste côté backend
      // ([Authorize] et rôles contenus dans le token).
      const admin = session()?.admin;
      const refus = mode === 'admin' && !admin ? 'Ce compte n\'est pas administrateur'
        : mode === 'user' && admin ? 'Ce compte est administrateur : utilisez l\'onglet Administrateur'
        : '';
      if (refus) {
        store.del('token');   // même effet que la déconnexion
        throw new Error(refus);
      }
      location.href = 'index.html';
    } catch (er) {
      toast(er.message, true);
      $('#ferr').textContent = er.message;
    }
  };
}

// Affiche le formulaire d'inscription (bouton « S'inscrire » de la barre ou lien
// « Créer un compte »), le fait défiler à l'écran et place le curseur sur le premier champ.
// Sans effet gênant si l'inscription est déjà affichée.
function ouvrirInscription() {
  if (mode !== 'register') {
    mode = 'register';
    draw();
  }
  $('#f').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#f input').focus({ preventScroll: true });
}

/* ---------- Initialisation ---------- */

// login.html#inscription (bouton « S'inscrire » d'une autre page) : ouvre directement l'inscription.
if (location.hash === '#inscription') ouvrirInscription();
else draw();
