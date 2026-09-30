(function () {
  const splash = document.createElement('div');
  splash.id = 'brand-splash';

  const image = document.createElement('img');
  image.src = 'malsseum-splash.png';
  image.alt = '말씀안에 - 마음이 쉬어가는 곳';

  splash.appendChild(image);
  document.body.prepend(splash);

  setTimeout(() => {
    splash.classList.add('is-hiding');

    setTimeout(() => {
      splash.remove();
    }, 350);
  }, 1200);
})();