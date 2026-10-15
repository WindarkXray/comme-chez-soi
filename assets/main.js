/* Comme chez Soi — interactions & motion design */
(function () {
  window.__ccs = true;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const anim = hasGsap && !reduce;
  const DATA = window.CCS || { dishes: {}, menus: [] };
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isMobile = () => window.innerWidth < 761;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!anim) { root.classList.remove('js'); const l = $('.loader'); if (l) l.style.display = 'none'; }
  if (hasGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }

  /* ---------- Service du jour (heure de Bruxelles) : mer–sam, midi 12:00–13:00, soir 19:00–20:30 ---------- */
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const OPEN = [3, 4, 5, 6];
  function brussels() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const g = t => (p.find(x => x.type === t) || {}).value;
    return { day: wd[g('weekday')] ?? new Date().getDay(), h: (+g('hour') % 24) + (+g('minute')) / 60 };
  }
  function nextOpen(day) { for (let i = 1; i <= 7; i++) { const d = (day + i) % 7; if (OPEN.includes(d)) return i === 1 ? 'demain' : DAYS[d]; } return ''; }
  function status() {
    const t = brussels();
    if (OPEN.includes(t.day)) {
      if (t.h < 13) return 'Aujourd’hui · midi 12:00 – 13:00 · soir 19:00 – 20:30';
      if (t.h < 20.5) return 'Ce soir · accueil de 19:00 à 20:30';
      return `Prochain service ${nextOpen(t.day)} à 12:00`;
    }
    return `Fermé aujourd’hui · réouvre ${nextOpen(t.day)} à 12:00`;
  }
  const paint = () => $$('[data-status]').forEach(el => el.textContent = status());
  paint(); setInterval(paint, 60000);
  const today = brussels().day;
  $$('[data-day]').forEach(el => { if (+el.dataset.day === today) el.classList.add('today'); });

  /* ---------- Menu mobile, header, anneau, copier, formulaire ---------- */
  const burger = $('.burger');
  if (burger) burger.addEventListener('click', () => {
    const on = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', on); burger.setAttribute('aria-label', on ? 'Fermer le menu' : 'Ouvrir le menu');
    if (window.__lenis) on ? window.__lenis.stop() : window.__lenis.start();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click(); });
  const header = $('.header'), ring = $('.ring'), ringFg = ring && $('.ring-fg', ring);
  function onScroll(y) {
    if (header) header.classList.toggle('scrolled', y > 40);
    if (ring) {
      ring.hidden = y < 500;
      const max = document.documentElement.scrollHeight - innerHeight;
      ringFg.style.strokeDashoffset = (169.6 * (1 - Math.min(1, y / Math.max(1, max)))).toFixed(1);
    }
  }
  window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);
  if (ring) ring.addEventListener('click', () => window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.8 }) : window.scrollTo({ top: 0, behavior: 'smooth' }));

  $$('[data-copy]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const done = () => { const t = b.textContent; b.textContent = 'Copié'; setTimeout(() => b.textContent = t, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done).catch(() => {});
  }));

  const form = $('#contact-form');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('.f-msg', form);
    if (!form.checkValidity()) { msg.className = 'f-msg err'; msg.textContent = 'Merci d’indiquer votre nom, un e-mail valide et l’occasion.'; return; }
    const key = form.querySelector('[name=access_key]').value;
    if (!key || key.startsWith('VOTRE')) { msg.className = 'f-msg err'; msg.textContent = 'Formulaire pas encore relié : ajoutez la clé Web3Forms dans salons.html.'; return; }
    msg.className = 'f-msg'; msg.textContent = 'Envoi…';
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!(await r.json()).success) throw new Error();
      msg.className = 'f-msg ok'; msg.textContent = 'Merci. Votre demande est bien arrivée, la maison vous recontacte rapidement.'; form.reset();
    } catch { msg.className = 'f-msg err'; msg.textContent = 'L’envoi n’a pas abouti. Écrivez-nous à info@commechezsoi.be ou appelez le +32 2 512 29 21.'; }
  });

  /* ---------- Menus de saison : 5, 6 ou 7 services, avec ou sans vins ---------- */
  const app = $('.menu-app');
  if (app && DATA.menus.length) {
    const list = $('.courses', app), num = $('.mp-num', app), last = $('.mp-last', app), wine = $('#wine', app);
    const base = DATA.menus[0].c;
    let n = 5, shown = DATA.menus[0].p;
    const render = (first) => {
      const m = DATA.menus.find(x => x.n === n);
      const target = wine.checked ? m.v : m.p;
      last.textContent = m.last;
      list.innerHTML = m.c.map(k => `<li class="${base.includes(k) ? '' : 'new'}" data-from="${DATA.menus.find(x => x.c.includes(k)).n}"><span>${DATA.dishes[k]}</span></li>`).join('');
      if (anim && !first) {
        gsap.from($$('li', list), { y: 18, opacity: 0, duration: .6, stagger: .05, ease: 'power3.out' });
        const o = { v: shown };
        gsap.to(o, { v: target, duration: .9, ease: 'power3.out', onUpdate: () => num.textContent = Math.round(o.v) });
        gsap.fromTo(num.parentElement, { scale: .96 }, { scale: 1, duration: .6, ease: 'back.out(2)' });
      } else num.textContent = target;
      shown = target;
    };
    $$('.seg button', app).forEach(b => b.addEventListener('click', () => {
      n = +b.dataset.n;
      $$('.seg button', app).forEach(x => x.setAttribute('aria-selected', x === b));
      render(false);
    }));
    wine.addEventListener('change', () => render(false));
    render(true);
  }

  /* ---------- Image qui suit la souris sur la carte ---------- */
  const layer = $('.hover-layer');
  if (layer && fine && hasGsap) {
    const hv = $$('.hv', layer);
    const qx = gsap.quickTo(layer, 'x', { duration: .6, ease: 'power3' }), qy = gsap.quickTo(layer, 'y', { duration: .6, ease: 'power3' });
    window.addEventListener('mousemove', e => { qx(e.clientX + 30); qy(e.clientY - 165); }, { passive: true });
    $$('.dish[data-img]').forEach(d => {
      d.addEventListener('mouseenter', () => { layer.classList.add('on'); hv.forEach(h => h.classList.toggle('on', h.dataset.k === d.dataset.img)); });
      d.addEventListener('mouseleave', () => layer.classList.remove('on'));
    });
  }

  /* ---------- Vitrail ---------- */
  const lightUpTo = (svg, i) => {
    $$('.lancet', svg).forEach((l, k) => l.classList.toggle('lit', k <= i));
    const rose = $('.rose', svg); if (rose) rose.classList.toggle('lit', i >= 4);
    const g = $('.v-glow', svg); if (g) g.setAttribute('opacity', i < 0 ? 0 : (.15 + i * .12).toFixed(2));
  };
  const small = $('.vitrail.small');
  if (small) {
    $$('.lancet', small).forEach(l => {
      const on = () => l.classList.add('lit');
      l.addEventListener('mouseenter', on); l.addEventListener('click', () => l.classList.toggle('lit'));
    });
    if (anim) ScrollTrigger.create({ trigger: small, start: 'top 65%', once: true, onEnter: () => { [0, 1, 2, 3, 4].forEach(i => setTimeout(() => lightUpTo(small, i), 350 * i + 200)); } });
    else lightUpTo(small, 4);
  }

  /* ---------- Bulles de champagne ---------- */
  function bubbles(cv) {
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const n = Math.round((+cv.dataset.count || 40) * (isMobile() ? .45 : 1));
    let W = 0, H = 0, parts = [], run = false, raf = 0;
    const make = fresh => ({ x: Math.random() * W, y: fresh ? Math.random() * H : H + 10, r: .8 + Math.random() * 2.6, vy: .25 + Math.random() * .7, ph: Math.random() * 6.28, f: .5 + Math.random() });
    const size = () => { const dpr = Math.min(1.5, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); parts = Array.from({ length: n }, () => make(true)); };
    const tick = t => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.vy * (1 + p.r * .15); p.x += Math.sin(t / 900 * p.f + p.ph) * .35;
        const a = Math.min(1, p.y / H) * .55;
        ctx.strokeStyle = `rgba(229,203,152,${a.toFixed(3)})`; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
        if (p.r > 2) { ctx.fillStyle = `rgba(255,243,214,${(a * .5).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .3, 0, 6.283); ctx.fill(); }
        if (p.y < -8) Object.assign(p, make(false));
      }
      if (run) raf = requestAnimationFrame(tick);
    };
    size(); addEventListener('resize', () => { if (Math.abs(cv.clientWidth - W) > 20) size(); });
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !run) { run = true; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting && run) { run = false; cancelAnimationFrame(raf); }
    })).observe(cv.parentElement);
  }
  if (!reduce) $$('canvas.bubbles').forEach(bubbles);


  /* ---------- Le livre d’or : les pages se tournent au scroll (fonctionne aussi sans GSAP) ---------- */
  const livre = $('.livre');
  if (livre && !reduce) {
    const bookEl = $('.book', livre), leaves = $$('.leaf', livre), bar = $('.livre-progress span', livre);
    const n = leaves.length;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let last = -1;
    const draw = () => {
      const r = livre.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      if (Math.abs(p - last) < .0005) return; last = p;
      const f = p * (n + .5);
      const mob = isMobile();
      let t0 = 0, tl = 0;
      leaves.forEach((lf, k) => {
        const t = ease(Math.min(1, Math.max(0, f - k)));
        if (k === 0) t0 = t; if (k === n - 1) tl = t;
        const lift = Math.sin(t * Math.PI) * (mob ? 0 : 30);
        lf.style.transform = `translateZ(${lift.toFixed(1)}px) rotateY(${(-180 * t).toFixed(2)}deg)`;
        lf.style.zIndex = t > .5 ? 10 + k : 10 + (n - k);
        lf.style.setProperty('--sh', (1 - Math.abs(.5 - t) * 2 * .0 + Math.sin(t * Math.PI) * .8).toFixed(2));
        if (mob) lf.style.opacity = k === n - 1 ? 1 : (1 - Math.max(0, t - .55) / .45).toFixed(2);
      });
      if (!mob) bookEl.style.transform = `rotateX(8deg) translateX(${(-25 * (1 - t0) + 25 * tl).toFixed(2)}%)`;
      else bookEl.style.transform = '';
      if (bar) bar.style.transform = `scaleX(${p.toFixed(3)})`;
    };
    const loop = () => { draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  if (!anim) return;

  /* =========================================================
     MOTION (GSAP)
     ========================================================= */
  if (window.Lenis && !isMobile()) {
    const lenis = new Lenis({ duration: 1.35, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', e => { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); }));
  }

  // titres découpés en mots
  $$('.split').forEach(el => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = part; w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  });

  // ornements Art nouveau : le trait se dessine
  $$('.orn path').forEach(p => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
  $$('.orn').forEach(o => { if (!o.closest('.hero')) gsap.to($$('path', o), { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: o, start: 'top 88%', once: true } }); });

  // le rideau : 1926 → 2026, puis il s'ouvre
  const loader = $('.loader');
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (loader) {
    let seen = false; try { seen = sessionStorage.getItem('ccs-seen') === '1'; sessionStorage.setItem('ccs-seen', '1'); } catch (e) {}
    const ly = $('.ly', loader); const o = { y: 1926 };
    intro.from('.loader-in', { opacity: 0, y: 20, duration: .6 })
      .to(o, { y: 2026, duration: seen ? .5 : 1.6, ease: 'power2.inOut', onUpdate: () => ly.textContent = Math.round(o.y) }, '-=.3')
      .to('.loader-in', { opacity: 0, y: -20, duration: .5, ease: 'power2.in' }, '+=.15')
      .to('.loader-l', { xPercent: -100, duration: 1.3, ease: 'expo.inOut' }, '-=.1')
      .to('.loader-r', { xPercent: 100, duration: 1.3, ease: 'expo.inOut' }, '<')
      .set(loader, { display: 'none' });
  }
  const at = loader ? '-=1' : 0;
  if ($('.hero-ph img')) intro.fromTo('.hero-ph img', { scale: 1.3 }, { scale: 1.12, duration: 2.6, ease: 'expo.out' }, at);
  const lines = $$('.hero-title .line > *, .ptitle .line > *');
  if (lines.length) intro.from(lines, { yPercent: 110, duration: 1.4, stagger: .12 }, loader ? '-=.9' : 0);
  const hl = $$('.hero .orn path'); if (hl.length) intro.to(hl, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, '-=1.2');
  if ($$('.hero .reveal, .phead .reveal').length) intro.to('.hero .reveal, .phead .reveal', { opacity: 1, y: 0, duration: 1.1, stagger: .1 }, '-=1.6');
  if ($('.hero-badge')) intro.from('.hero-badge', { scale: .4, opacity: 0, rotate: -60, duration: 1.4 }, '-=1.2');

  // transition entre pages : le rideau se referme
  $$('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href) || a.target === '_blank') return;
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (!loader) { location.href = href; return; }
      document.body.classList.remove('menu-open');
      gsap.set(loader, { display: 'grid' }); gsap.set('.loader-in', { opacity: 0 });
      gsap.timeline({ onComplete: () => location.href = href })
        .fromTo('.loader-l', { xPercent: -100 }, { xPercent: 0, duration: .8, ease: 'expo.inOut' })
        .fromTo('.loader-r', { xPercent: 100 }, { xPercent: 0, duration: .8, ease: 'expo.inOut' }, '<')
        .to('.loader-in', { opacity: 1, duration: .3 }, '-=.2');
    });
  });
  addEventListener('pageshow', e => { if (e.persisted && loader) gsap.set(loader, { display: 'none' }); });

  // apparitions
  ScrollTrigger.batch('.reveal:not(.hero .reveal):not(.phead .reveal)', { start: 'top 90%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .09 }) });
  $$('.reveal-img').forEach(el => gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
  $$('.split').forEach(el => gsap.from($$('.wi', el), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  // parallaxe
  $$('[data-speed]').forEach(el => { const i = $('img', el) || el; gsap.fromTo(i, { yPercent: -7, scale: 1.14 }, { yPercent: 7, scale: 1.14, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  if ($('.hero')) {
    gsap.to('.hero-img', { yPercent: 22, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // compteurs
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, from = end > 1000 ? end - 100 : 0, o = { v: from };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => el.textContent = Math.round(o.v) });
  });

  // les indéracinables : défilement horizontal
  const sigs = $('.sigs');
  if (sigs && !isMobile()) {
    const track = $('.sigs-track', sigs);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.sigs-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
    $$('.sig .ph img', sigs).forEach(i => gsap.fromTo(i, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.sigs-pin', start: 'top top', end: () => '+=' + dist(), scrub: true } }));
  }

  // L'histoire : le vitrail s'allume génération après génération
  const story = $('.story');
  if (story) {
    const big = $('.vitrail.big', story), lis = $$('.gens li', story);
    let cur = -2;
    ScrollTrigger.create({
      trigger: story, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => {
        const i = Math.min(4, Math.floor(self.progress * 5.4));
        if (i !== cur) { cur = i; lightUpTo(big, i); lis.forEach((li, k) => li.classList.toggle('on', k === i)); }
      }
    });
    lightUpTo(big, 0); lis[0] && lis[0].classList.add('on');
  }

  // boutons : légère attraction magnétique (souris)
  if (fine) $$('.btn').forEach(b => {
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .18, y: (e.clientY - r.top - r.height / 2) * .3, duration: .6, ease: 'power3.out' }); });
    b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.45)' }));
  });

  // en-têtes : l’arche monte, le médaillon apparaît
  if ($('.phead-art')) {
    intro.from('.pa-arch', { yPercent: 18, opacity: 0, duration: 1.8, ease: 'expo.out' }, loader ? '-=1.4' : .2)
         .from('.pa-round', { scale: 0, rotate: -40, duration: 1.4, ease: 'back.out(1.6)' }, '-=1.4')
         .from('.pa-ring', { opacity: 0, duration: 1 }, '-=1');
    gsap.to('.pa-arch img', { yPercent: 10, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.phead', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.pa-round', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.phead', start: 'top top', end: 'bottom top', scrub: true } });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
