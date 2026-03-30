const isGallery = window.location.pathname.endsWith('gallery.html');

async function loadComponent(id, file) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(id).outerHTML = html;
}

Promise.all([
  loadComponent('site-nav', '_nav.html'),
  loadComponent('site-footer', '_footer.html'),
]).then(() => {
  if (isGallery) {
    const nav = document.querySelector('.hero-nav');
    nav.classList.add('nav--dark');
    const galleryLink = nav.querySelector('[data-page="gallery"]');
    if (galleryLink) galleryLink.classList.add('nav-link--active');
  }
});
