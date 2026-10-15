(() => {
  'use strict';

  const installButtons = document.querySelectorAll('.install-btn');
  const modal      = document.getElementById('install-modal');
  const modalBody  = document.getElementById('install-modal-body');
  const modalIcon  = document.getElementById('install-modal-icon');
  const modalTitle = document.getElementById('install-modal-title');

  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function markInstalled() {
    installButtons.forEach((btn) => {
      btn.textContent = '✓ Instalada';
      btn.disabled = true;
    });
  }

  if (isStandalone()) markInstalled();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markInstalled();
  });

  const IOS_STEPS = `
    <ol>
      <li>Tocá el botón <strong>Compartir</strong> (el cuadrado con la flecha) en la barra de Safari.</li>
      <li>Elegí <strong>"Añadir a pantalla de inicio"</strong>.</li>
      <li>Tocá <strong>"Agregar"</strong> y listo: ya tenés Mandale Fruta como app.</li>
    </ol>`;

  const GENERIC_STEPS = `
    <ol>
      <li>Abrí el menú del navegador (los tres puntos ⋮ o el ícono de instalar de la barra).</li>
      <li>Elegí <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
      <li>Confirmá y la app aparecerá junto al resto de tus aplicaciones.</li>
    </ol>`;

  function showInstructions() {
    if (isIOS) {
      modalIcon.textContent  = '🍎';
      modalTitle.textContent = 'Instalar en iPhone / iPad';
      modalBody.innerHTML    = IOS_STEPS;
    } else {
      modalIcon.textContent  = '📲';
      modalTitle.textContent = 'Instalar la app';
      modalBody.innerHTML    = GENERIC_STEPS;
    }
    modal.classList.remove('hidden');
  }

  installButtons.forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (isStandalone()) return;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        return;
      }
      showInstructions();
    }));

  document.getElementById('install-modal-close')
    .addEventListener('click', () => modal.classList.add('hidden'));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.add('hidden');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
