(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) body.classList.add('reduce-motion');

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Language toggle: English by default, Chinese when requested.
  const langButton = document.querySelector('[data-lang-toggle]');
  const savedLang = localStorage.getItem('bw-lang');
  if (savedLang === 'zh') {
    doc.classList.remove('lang-en');
    doc.classList.add('lang-zh');
    if (langButton) langButton.textContent = 'EN';
  }
  langButton?.addEventListener('click', () => {
    const zh = doc.classList.toggle('lang-zh');
    doc.classList.toggle('lang-en', !zh);
    localStorage.setItem('bw-lang', zh ? 'zh' : 'en');
    langButton.textContent = zh ? 'EN' : '中文';
  });

  // Smooth anchor navigation, without hijacking external links.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (event) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const offset = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: offset, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // Reveal on scroll.
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // Pointer state and custom cursor.
  let px = window.innerWidth / 2;
  let py = window.innerHeight / 2;
  let sx = px;
  let sy = py;
  let nx = 0;
  let ny = 0;
  let snx = 0;
  let sny = 0;
  const dot = document.querySelector('[data-cursor-dot]');
  const ring = document.querySelector('[data-cursor-ring]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const usePointerFx = finePointer && !reduce;

  window.addEventListener('pointermove', (event) => {
    px = event.clientX;
    py = event.clientY;
    nx = (px / window.innerWidth - 0.5) * 2;
    ny = (py / window.innerHeight - 0.5) * 2;
    doc.style.setProperty('--mx', `${px}px`);
    doc.style.setProperty('--my', `${py}px`);
  }, { passive: true });

  if (usePointerFx) {
    document.querySelectorAll('a, button, [data-magnet]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        if (!ring) return;
        ring.style.width = '56px';
        ring.style.height = '56px';
        ring.style.margin = '-28px 0 0 -28px';
        ring.style.borderColor = 'rgba(168, 111, 69, .54)';
        ring.style.backgroundColor = 'rgba(168, 111, 69, .12)';
      });
      el.addEventListener('pointerleave', () => {
        if (!ring) return;
        ring.style.width = '34px';
        ring.style.height = '34px';
        ring.style.margin = '-17px 0 0 -17px';
        ring.style.borderColor = 'rgba(23, 21, 17, .42)';
        ring.style.backgroundColor = 'transparent';
      });
    });
  }

  // Project card tilt.
  if (usePointerFx) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const lx = (event.clientX - rect.left) / rect.width - 0.5;
        const ly = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--card-x', `${(lx + 0.5) * 100}%`);
        card.style.setProperty('--card-y', `${(ly + 0.5) * 100}%`);
        card.style.transform = `perspective(1000px) rotateX(${-ly * 4.5}deg) rotateY(${lx * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        card.style.setProperty('--card-x', '50%');
        card.style.setProperty('--card-y', '50%');
      });
    });
  }

  const nav = document.querySelector('[data-nav]');
  const story = document.querySelector('[data-story]');
  const storyProgress = document.querySelector('[data-story-progress]');
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const reportCode = document.querySelector('[data-report-code]');
  const checksum = document.querySelector('[data-checksum]');
  const scenes = Array.from(document.querySelectorAll('[data-scene]'));
  const magnets = Array.from(document.querySelectorAll('[data-magnet]'));

  const reports = [
    `$ trace-vault replay agent-run.json\n· reading ledger ........ running\n· witness cross-check ... idle\n· eval gate ............. idle\n· proof receipt ......... pending`,
    `$ nightwatch attest run.ledger\n✓ ledger hash chain ..... intact\n· witness cross-check ... running\n· eval gate ............. idle\n· proof receipt ......... pending`,
    `$ dual-witness compare\n✓ agent receipt ......... signed\n✓ black-box ledger ...... append-only\n· eval gate ............. running\n· proof receipt ......... pending`,
    `$ trust-gate verify\n✓ replay assertions ..... passed\n✓ undeclared claims ..... 0\n✓ policy gates .......... passed\n· proof receipt ......... signing`,
    `$ emit trust-report-v0\n✓ verdict ............... PASS\n✓ witnesses ............. 2 / 2\n✓ receipt ............... signed\n→ safe to ship`
  ];
  const checksums = ['7a91-2e10', '9c04-a7fb', 'bf31-80ac', 'd221-77e9', 'f6aa-c913'];

  function updateStory() {
    if (!story) return;
    const vh = window.innerHeight;
    const rect = story.getBoundingClientRect();
    const total = Math.max(1, rect.height - vh);
    const p = clamp(-rect.top / total);
    doc.style.setProperty('--story-p', p.toFixed(3));
    if (storyProgress) storyProgress.style.height = `${p * 100}%`;
    const active = Math.min(steps.length - 1, Math.floor(p * steps.length + 0.08));
    steps.forEach((step, index) => step.classList.toggle('active', index <= active));
    if (reportCode && reportCode.dataset.active !== String(active)) {
      reportCode.dataset.active = String(active);
      reportCode.textContent = reports[active] || reports[0];
    }
    if (checksum) checksum.textContent = checksums[active] || checksums[0];
  }

  function animate() {
    const scrollY = window.scrollY || window.pageYOffset;
    nav?.classList.toggle('scrolled', scrollY > 26);

    if (usePointerFx) {
      sx = lerp(sx, px, 0.18);
      sy = lerp(sy, py, 0.18);
      snx = lerp(snx, nx, 0.07);
      sny = lerp(sny, ny, 0.07);
      doc.style.setProperty('--nx', snx.toFixed(3));
      doc.style.setProperty('--ny', sny.toFixed(3));
      if (dot) dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      scenes.forEach((scene) => {
        scene.style.transform = `perspective(1200px) rotateX(${-sny * 3.2}deg) rotateY(${snx * 4.8}deg)`;
      });
      magnets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy);
        const radius = Math.max(rect.width, 140);
        if (dist < radius) {
          const force = 1 - dist / radius;
          el.style.transform = `translate3d(${dx * 0.18 * force}px, ${dy * 0.18 * force}px, 0)`;
        } else {
          el.style.transform = '';
        }
      });
    }

    updateStory();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Ambient field canvas: low-frequency life, mouse-reactive but intentionally quiet.
  const canvas = document.getElementById('field');
  const ctx = canvas?.getContext('2d', { alpha: true });
  let particles = [];
  let dpr = 1;

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(76, Math.max(36, Math.floor(window.innerWidth / 18)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      ox: Math.random() * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.34,
      size: 0.7 + Math.random() * 1.8,
      phase: index * 0.17
    }));
  }

  function drawField(time = 0) {
    if (!canvas || !ctx || reduce) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const t = time * 0.001;
    for (const p of particles) {
      const driftX = Math.cos(t * p.speed + p.ox) * 0.18;
      const driftY = Math.sin(t * p.speed + p.ox) * 0.16;
      p.x += driftX;
      p.y += driftY;
      const dx = p.x - px;
      const dy = p.y - py;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 180) {
        const push = (1 - dist / 180) * 1.6;
        p.x += (dx / dist) * push;
        p.y += (dy / dist) * push;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 115) {
          ctx.strokeStyle = `rgba(47, 107, 115, ${0.055 * (1 - dist / 115)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      const alpha = 0.12 + Math.sin(t + p.phase) * 0.035;
      ctx.fillStyle = `rgba(47, 107, 115, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(drawField);
  }

  if (canvas && ctx && !reduce) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    requestAnimationFrame(drawField);
  }

  // Lightweight visit counter; failure is intentionally silent.
  const counterUrl = 'https://abacus.jasoncameron.dev/hit/beamuswayne.github.io/visits';
  const counterWrap = document.getElementById('visit-counter');
  const counterNum = document.getElementById('visit-count');
  if (counterWrap && counterNum) {
    fetch(counterUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        let value = data.value ?? data.count;
        if (typeof value === 'string') value = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!Number.isFinite(value)) return;
        counterNum.textContent = value.toLocaleString('en-US');
        counterWrap.classList.add('ready');
      })
      .catch(() => {});
  }
})();
