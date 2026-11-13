/* ============================================================
   ANA DOSYA
   Menü, ekran geçişleri, oyun döngüsü ve diğer dosyaları
   birbirine bağlayan kod burada.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = window.Oyun;
  const M = window.Matter;
  const STEP = 1000 / 60;   // sabit fizik adımı (ms)
  const FLOOR_H = 92;       // alttaki zemin şeridinin yüksekliği
  const $ = function (id) { return document.getElementById(id); };

  const state = (Oyun.state = {
    char: null, running: false,
    W: 0, H: 0, dpr: 1, groundY: 0,
    last: 0, acc: 0, raf: 0,
    bg: null, lastBump: 0, toastTimer: 0,
  });
  let canvas, ctx;

  /* ==================== MENÜ ==================== */

  function drawFacePreview() {
    const c = $('facePreview'), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    Oyun.face.draw(g, 150, { level: 0 });
    g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2);
    g.lineWidth = 8; g.strokeStyle = '#2b2b3a'; g.stroke();
    g.restore();
    $('btnClearPhoto').hidden = !Oyun.face.photo;
  }

  function drawCard(ch) {
    const c = document.querySelector('.card[data-id="' + ch.id + '"] canvas');
    if (!c) return;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    Oyun.drawPortrait(g, ch, c.width / 2, c.height / 2, c.width / 2 - 8);
  }

  function buildCards() {
    const wrap = $('charCards');
    wrap.innerHTML = '';
    Oyun.characters.forEach(function (ch) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.id = ch.id;
      b.style.setProperty('--c', ch.color);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 220;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = ch.name;
      const moves = document.createElement('div');
      moves.className = 'moves';
      moves.textContent = ch.attacks.map(function (id) { return Oyun.attacks[id].name; }).join(' · ');
      b.appendChild(cv); b.appendChild(name); b.appendChild(moves);
      b.addEventListener('click', function () { selectChar(ch); });
      wrap.appendChild(b);
      drawCard(ch);
    });
  }

  function selectChar(ch) {
    state.char = ch;
    document.querySelectorAll('.card').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.id === ch.id);
    });
    const s = $('btnStart');
    s.disabled = false;
    s.textContent = 'OYUNA BAŞLA ▶';
    Oyun.audio.init();
    Oyun.audio.play('click');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.toggle('active', el.id === id);
    });
  }

  /* ==================== OYUN KURULUMU ==================== */

  function ragdollScale() {
    return Math.max(0.5, Math.min(1.1, (state.groundY - 70) / 520));
  }

  function resize() {
    state.W = window.innerWidth;
    state.H = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.groundY = state.H - FLOOR_H;
    canvas.width = Math.round(state.W * state.dpr);
    canvas.height = Math.round(state.H * state.dpr);
    makeBackground();
    Oyun.physics.setBounds(state.W, state.H, state.groundY);
  }

  /* Arka planı bir kez çizip saklarız (her karede yeniden çizmek yerine). */
  function makeBackground() {
    const PAD = 50, W = state.W, H = state.H, gy = state.groundY;
    const c = document.createElement('canvas');
    c.width = (W + PAD * 2) * state.dpr; c.height = (H + PAD * 2) * state.dpr;
    const g = c.getContext('2d');
    g.scale(state.dpr, state.dpr);
    g.translate(PAD, PAD);
    const grad = g.createLinearGradient(0, 0, 0, gy);
    grad.addColorStop(0, '#8ecae6'); grad.addColorStop(1, '#d8f3ff');
    g.fillStyle = grad;
    g.fillRect(-PAD, -PAD, W + PAD * 2, gy + PAD);
    // Duvar kağıdı puanları
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let y = 40; y < gy; y += 90) {
      for (let x = ((y / 90) % 2) * 45; x < W + 45; x += 90) {
        g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
      }
    }
    // Zemin
    g.fillStyle = '#e09f3e';
    g.fillRect(-PAD, gy, W + PAD * 2, H - gy + PAD);
    g.fillStyle = '#c98628';
    for (let x = -PAD; x < W + PAD; x += 120) g.fillRect(x, gy, 4, H - gy + PAD);
    g.fillStyle = '#2b2b3a';
    g.fillRect(-PAD, gy - 2, W + PAD * 2, 5);
    state.bg = c;
  }

  function buildAttackBar() {
    const ch = state.char, wrap = $('attackButtons');
    wrap.innerHTML = '';
    ch.attacks.forEach(function (id, i) {
      const def = Oyun.attacks[id];
      const b = document.createElement('button');
      b.className = 'btn atk';
      b.style.setProperty('--c', ch.color);
      const key = document.createElement('kbd'); key.textContent = i + 1;
      const ico = document.createElement('span'); ico.className = 'ico';
      ico.textContent = def.icon || '🤕';
      const lbl = document.createElement('span'); lbl.textContent = def.name;
      b.appendChild(key); b.appendChild(ico); b.appendChild(lbl);
      b.addEventListener('click', function () { doAttack(i); b.blur(); });
      wrap.appendChild(b);
    });
    const pc = $('attackerPortrait'), g = pc.getContext('2d');
    g.clearRect(0, 0, pc.width, pc.height);
    Oyun.drawPortrait(g, ch, pc.width / 2, pc.height / 2, pc.width / 2 - 6);
    $('attackerName').textContent = ch.name;
  }

  function startGame() {
    if (!state.char) return;
    showScreen('game');
    Oyun.audio.init();
    Oyun.physics.init();
    setupOnce();
    resize();
    Oyun.effects.reset();
    Oyun.attackSystem.clear();
    Oyun.score.reset();
    buildAttackBar();
    standUp();
    state.running = true;
    state.last = performance.now();
    state.acc = 0;
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(frame);
  }

  function backToMenu() {
    state.running = false;
    cancelAnimationFrame(state.raf);
    Oyun.physics.releaseGrab();
    Oyun.ragdoll.destroy();
    Oyun.attackSystem.clear();
    showScreen('menu');
    drawFacePreview();
  }

  /* "Ayağa Kaldır": bebeği ekranın ortasında yeniden kurar (puan kalır). */
  function standUp() {
    Oyun.physics.releaseGrab();
    Oyun.ragdoll.build(state.W / 2, state.groundY, ragdollScale());
  }

  let didSetup = false;
  function setupOnce() {
    if (didSetup) return;
    didSetup = true;

    Oyun.physics.bindGrab(canvas, function () { return Oyun.ragdoll.bodies; }, {
      onGrab: function () { Oyun.audio.init(); Oyun.ragdoll.setStanding(false); Oyun.ragdoll.disturb(); },
      onRelease: function () { Oyun.ragdoll.disturb(); },
    });

    Oyun.attackSystem.onImpact = onImpact;

    // Duvara / yere sert çarpınca küçük bonus
    M.Events.on(Oyun.physics.engine, 'collisionStart', function (ev) {
      const now = performance.now();
      for (const pair of ev.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        const part = a.label === 'ragdoll' ? a : b.label === 'ragdoll' ? b : null;
        const wall = a.label === 'wall' || b.label === 'wall';
        if (!part || !wall || part.speed < 14 || now - state.lastBump < 280) continue;
        state.lastBump = now;
        const res = Oyun.score.add(Math.round(part.speed * 0.5));
        const p = clampPos(part.position.x, part.position.y - 40);
        Oyun.effects.popText(p.x, p.y, pick(['GÜM!', 'TOK!', 'PAT!']), 34);
        Oyun.effects.shake(part.speed * 0.25);
        Oyun.effects.burst(part.position.x, part.position.y, 3);
        Oyun.audio.play('thud', Math.min(1, part.speed / 30));
        Oyun.ragdoll.daze(900);
        Oyun.ragdoll.disturb();
        if (res.levelUp) announceLevel();
      }
    });
  }

  /* ==================== SALDIRI ==================== */

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function clampPos(x, y) {
    return { x: Math.max(110, Math.min(state.W - 110, x)), y: Math.max(120, Math.min(state.groundY - 30, y)) };
  }

  function doAttack(index) {
    const R = Oyun.ragdoll;
    if (!state.running || !R.parts) return;
    const id = state.char.attacks[index];
    const def = Oyun.attacks[id];
    if (!def) return;
    // Bebek hangi kenara yakınsa oradan vur ki ekranın geniş tarafına savrulsun
    const x = R.parts.torso.position.x;
    const side = x < state.W * 0.4 ? 1 : x > state.W * 0.6 ? -1 : (Math.random() < 0.5 ? 1 : -1);
    const getTarget = function () {
      if (!R.parts) return null;
      const p = R.parts[def.target].position;
      return { x: p.x, y: p.y };
    };
    if (Oyun.attackSystem.launch(id, state.char, getTarget, side, state.W)) {
      Oyun.audio.play('whoosh');
    }
  }

  /* Saldırı nesnesi hedefe değdiği an: fiziksel darbe + bütün efektler */
  function onImpact(a) {
    const R = Oyun.ragdoll, E = Oyun.effects;
    if (!R.parts || !a.hitPos) return;
    const def = a.def, s = a.side, now = performance.now();

    const power = def.power * (0.9 + Math.random() * 0.2) * Math.max(0.75, R.S);
    R.hit(def.target, s * power, -power * def.lift, s * def.spin);
    R.daze(1500 + def.power * 30);

    const res = Oyun.score.hit(def.damage, now);
    const pos = a.hitPos;

    E.shake(6 + def.power * 0.45);
    E.slowmo(110 + def.power * 5);
    E.ring(pos.x, pos.y);
    E.burst(pos.x, pos.y, 6 + Math.round(def.power / 4));
    const wp = clampPos(pos.x + s * 110, pos.y - 120 * R.S);
    E.popText(wp.x, wp.y, pick(def.words), 44 + def.power * 0.8, null, true);
    const dp = clampPos(pos.x - s * 70, pos.y - 110 * R.S);
    E.popText(dp.x, dp.y, '+' + res.gained, 32, '#ffffff');
    if (res.combo >= 3 && res.combo % 5 === 0) {
      E.popText(state.W / 2, state.H * 0.36, 'KOMBO x' + res.combo + '!', 70, '#ffd23f', true);
    }

    Oyun.audio.play(def.sound);
    if (Math.random() < 0.35) Oyun.audio.play('squeak');
    if (res.combo >= 2) Oyun.audio.play('combo', res.combo);
    if (res.levelUp) announceLevel();
  }

  function announceLevel() {
    toast('Yeni durum: ' + Oyun.score.levelNames[Oyun.score.level] + '!');
    Oyun.audio.play('levelup');
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }

  /* ==================== OYUN DÖNGÜSÜ ==================== */

  function frame(now) {
    if (!state.running) return;
    state.raf = requestAnimationFrame(frame);
    const realDt = Math.min(50, Math.max(0, now - state.last));
    state.last = now;

    const E = Oyun.effects, P = Oyun.physics, R = Oyun.ragdoll;
    const ts = E.timeScale(now);          // ağır çekim
    E.update(realDt);
    Oyun.attackSystem.update(realDt * ts);

    P.engine.timing.timeScale = ts;
    state.acc += realDt;
    let n = 0;
    while (state.acc >= STEP && n < 3) { P.step(STEP, R.bodies); state.acc -= STEP; n++; }
    if (state.acc > STEP) state.acc = 0;

    // Güvenlik: bir parça ekrandan kaçarsa bebeği geri getir
    if (R.bodies.some(function (b) { return P.isOutside(b); })) standUp();

    R.update(now);
    Oyun.score.update(now);
    render(now);
  }

  function render(now) {
    const E = Oyun.effects, R = Oyun.ragdoll, d = state.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.globalAlpha = 1;
    ctx.save();
    E.applyShake(ctx);
    ctx.drawImage(state.bg, -50, -50, state.W + 100, state.H + 100);
    R.draw(ctx, now, Oyun.score.level);
    Oyun.attackSystem.draw(ctx);
    if (R.parts && R.isDazed(now)) {
      const h = R.parts.head;
      E.drawHeadStars(ctx, h.position.x, h.position.y, h.rd.r, now / 1000, 4);
    }
    E.draw(ctx);
    ctx.restore();
  }

  /* ==================== BAŞLANGIÇ ==================== */

  function boot() {
    canvas = $('gameCanvas');
    ctx = canvas.getContext('2d');

    // Tarayıcılar (özellikle iPhone) sesi ancak bir dokunuşun içinde açar;
    // her dokunuşta sesin açık olduğundan emin oluruz.
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (type) {
      document.addEventListener(type, function () { Oyun.audio.init(); }, true);
    });

    // iPhone: iki parmakla sayfayı büyütmeyi kapat (çift dokunuş CSS'te kapatılıyor)
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    buildCards();
    drawFacePreview();
    Oyun.loadCharacterImages(drawCard);

    // Fotoğraf yükleme
    $('btnUpload').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = ''; // aynı dosya tekrar seçilebilsin
      if (!file) return;
      Oyun.cropper.open(file, function (cropped) {
        Oyun.face.setPhoto(cropped);
        drawFacePreview();
      });
    });
    $('btnClearPhoto').addEventListener('click', function () {
      Oyun.face.clearPhoto();
      drawFacePreview();
    });

    $('btnStart').addEventListener('click', startGame);
    $('btnMenu').addEventListener('click', backToMenu);
    $('btnStand').addEventListener('click', function (e) { standUp(); e.currentTarget.blur(); });
    $('btnMute').addEventListener('click', function (e) { toggleMute(); e.currentTarget.blur(); });

    window.addEventListener('resize', function () {
      if (!state.running) return;
      resize();
      standUp();
    });

    // Klavye: 1-2 saldırı, R ayağa kaldır, M ses, Esc menü
    window.addEventListener('keydown', function (e) {
      if (!state.running || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '9') {
        const i = parseInt(k, 10) - 1;
        if (i < state.char.attacks.length) doAttack(i);
      } else if (k === 'r') {
        standUp();
      } else if (k === 'm') {
        toggleMute();
      } else if (k === 'escape') {
        backToMenu();
      }
    });
  }

  function toggleMute() {
    $('btnMute').textContent = Oyun.audio.toggleMute() ? '🔇' : '🔊';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
