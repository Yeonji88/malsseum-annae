(function () {
  const nativeSplash = window.MalsseumAndroidSplash;
  const splash = document.createElement('div');
  splash.id = 'brand-splash';

  const brand = document.createElement('div');
  brand.className = 'splash-brand';

const brandImage = document.createElement(nativeSplash ? 'div' : 'img');
if (nativeSplash) {
  brandImage.className = 'native-logo-space';
  brandImage.setAttribute('aria-hidden', 'true');
} else {
  brandImage.className = 'splash-brand-image';
  brandImage.src = 'malsseum-brand.png';
  brandImage.alt = '말씀 안에';
}

  const taglineWrap = document.createElement('div');
  taglineWrap.className = 'splash-tagline-wrap';

  const wind = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wind.setAttribute('class', 'splash-wind');
  wind.setAttribute('viewBox', '0 0 270 60');
  wind.setAttribute('aria-hidden', 'true');
  wind.innerHTML = `
    <path d="M8 22 C52 8, 78 34, 124 20 S202 9, 260 21" />
    <path d="M22 38 C65 27, 92 48, 139 35 S210 27, 250 36" />
  `;

  const tagline = document.createElement('div');
  tagline.className = 'splash-tagline';

  const text = '마음이 쉬어가는 곳';

  [...text].forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'splash-letter';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${0.38 + index * 0.085}s`;
    tagline.appendChild(span);
  });

  taglineWrap.appendChild(wind);
  taglineWrap.appendChild(tagline);

brand.appendChild(brandImage);
brand.appendChild(taglineWrap);

  splash.appendChild(brand);
  document.body.prepend(splash);

  setTimeout(() => {
    if (nativeSplash) nativeSplash.startFade();
    splash.classList.add('is-hiding');

    setTimeout(() => {
      splash.remove();
      document.body.classList.remove('splash-loading');
      if (nativeSplash) nativeSplash.finish();
    }, 350);
  }, 2100);
})();
