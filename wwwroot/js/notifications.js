/* =====================================================================
 * notifications.js : toutes mes notifications (notifications.html)
 * Filtre Toutes / Non lues, pagination commune, « Tout marquer comme lu »,
 * suppression. Le serveur ne renvoie que les notifications du compte connecté.
 * ===================================================================== */

/* ---------- État de la page ---------- */

let nonLuesSeulement = false;   // filtre courant
let page = 1;                   // page courante (conservée après une action)
let notifs = [];                // notifications chargées pour le filtre courant

/* ---------- Affichage ---------- */

function dessiner() {
  const r = paginer(notifs, PAGE_SIZE, page);
  page = r.page;
  $('#out').innerHTML = notifs.length
    ? `<div class="panel notif-liste">${r.items.map(n => `<div class="notif-ligne">
          ${ligneNotification(n)}
          <button class="btn small danger" data-suppr="${n.id}">Supprimer</button>
        </div>`).join('')}</div>${r.html}`
    : `<p class="stat-vide">${nonLuesSeulement ? 'Aucune notification non lue' : 'Aucune notification'}</p>`;
  brancherPager($('#out'), d => { page += d; dessiner(); });
}

// Charge toutes mes notifications du filtre courant (toutes les pages de l'API).
async function charger() {
  notifs = await toutes('/api/Notifications' + (nonLuesSeulement ? '?nonLues=true' : ''));
  dessiner();
}

/* ---------- Initialisation et événements ---------- */

view(`<div class="sec">
    <h2>Notifications</h2>
    <div class="actions">
      <div class="chips">
        <button class="chip on" data-f="toutes">Toutes</button>
        <button class="chip" data-f="nonlues">Non lues</button>
      </div>
      <button class="btn primary small" id="toutLu">Tout marquer comme lu</button>
    </div>
  </div>
  <div id="out">${skeleton(1)}</div>`);

// Filtre : retour à la page 1.
document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
  nonLuesSeulement = b.dataset.f === 'nonlues';
  document.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b));
  page = 1;
  charger().catch(e => toast(e.message, true));
});

$('#toutLu').onclick = async () => {
  try {
    await api('/api/Notifications/lues', 'PUT');
    toast('Toutes les notifications sont lues');
    await charger();
    majNotifications();
  } catch (e) {
    toast(e.message, true);
  }
};

// Clic sur une notification : marquer lue puis ouvrir ; bouton « Supprimer » : confirmation.
$('#out').onclick = e => {
  const suppr = e.target.closest('[data-suppr]');
  if (suppr) return confirmDo('Supprimer cette notification ?', async () => {
    try {
      await api(`/api/Notifications/${suppr.dataset.suppr}`, 'DELETE');
      toast('Notification supprimée');
      await charger();
      majNotifications();
    } catch (er) {
      toast(er.message, true);
    }
  });
  const el = e.target.closest('[data-notif]');
  const n = el && notifs.find(x => x.id === +el.dataset.notif);
  if (n) ouvrirNotification(n);
};

charger().catch(e => {
  toast(e.message, true);
  $('#out').innerHTML = '<p class="stat-vide">Notifications indisponibles</p>';
});
