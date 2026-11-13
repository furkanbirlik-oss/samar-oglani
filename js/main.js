/* ============================================================
   ANA DOSYA
   Menü, yetenek seçimi, ekran geçişleri, oyun döngüsü ve diğer
   dosyaları birbirine bağlayan kod burada.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = window.Oyun;
  const M = window.Matter;
  const STEP = 1000 / 60;     // sabit fizik adımı (ms)
  const FLOOR_H = 92;         // alttaki zemin şeridinin yüksekliği
  const MAX_SKILLS = 4;       // oyuna en fazla kaç yetenek alınır
  const ROUND_SECONDS = 60;   // yarış modunun süresi
  const RAGE_MS = 5000;       // çıldırma süresi
  const MIN_GAP = 170;        // iki saldırı arasındaki en kısa süre (ms)
  const $ = function (id) { return document.getElementById(id); };

  const OUCH = ['Ay!', 'Of!', 'Anneee!', 'Yeter be!', 'Ben ne yaptım?', 'Dur dur dur!', 'Şaka mıydı bu?', 'Uff!', 'İmdaat!'];
  const TAUNT = ['Hepsi bu mu?', 'Gıdıklandım!', 'Sıkıldım...', 'Vuramazsın ki!', 'Hadi ama!'];
  const RANKS = [[0, 'Sinek Ürkütücü'], [2500, 'Mahalle Kabadayısı'], [6000, 'Terlik Ustası'], [10000, 'Tokat Makinesi'], [15000, 'Efsane Şamarcı']];

  const state = (Oyun.state = {
    char: null, running: false,
    loadout: [], loadoutFor: null,   // seçilen yetenekler ve hangi karakter için seçildiği
    mode: 'free',                    // 'free' serbest | 'timed' 60 saniye yarışı
    best: { timed: 0 },              // bu oturumun rekoru (sadece bellekte)
    W: 0, H: 0, dpr: 1, groundY: 0,
    last: 0, acc: 0, raf: 0,
    bg: null, lastBump: 0, toastTimer: 0,
    cooldown: {}, lastLaunch: 0, cdEls: [],
    rageUntil: 0, raging: false, lastAuto: 0,
    tornado: null,
    timeStart: 0, over: false, lastSecond: -1,
    lastBubble: 0,
  });
  let canvas, ctx;

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ==================== MENÜ ==================== */

  function drawFacePreview() {
    const c = $('facePreview'), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    Oyun.face.draw(g, 150, { level: 0, cream: false });
    g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2);
    g.lineWidth = 8; g.strokeStyle = '#2b2b3a'; g.stroke();
    g.restore();
    const has = !!Oyun.face.photo;
    $('btnClearPhoto').hidden = !has;
    $('styleChips').hidden = !has;
    document.querySelectorAll('#styleChips .chip').forEach(function (el) {
      el.classList.toggle('on', el.dataset.style === Oyun.face.style);
    });
  }

  function buildStyleChips() {
    const wrap = $('styleChips');
    Oyun.cartoon.styles.forEach(function (st) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.dataset.style = st.id;
      b.textContent = st.name;
      b.addEventListener('click', function () {
        Oyun.face.setStyle(st.id);
        Oyun.audio.play('click');
        drawFacePreview();
      });
      wrap.appendChild(b);
    });
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
      moves.textContent = 'Favori: ' + ch.attacks.map(function (id) { return Oyun.attacks[id].name; }).join(' · ');
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
    s.textContent = 'YETENEK SEÇ ▶';
    Oyun.audio.play('click');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.toggle('active', el.id === id);
    });
  }

  /* ==================== YETENEK SEÇİMİ ==================== */

  function openLoadout() {
    if (!state.char) return;
    const ch = state.char;
    if (state.loadoutFor !== ch.id) { // yeni karakter: favorileriyle başla
      state.loadout = ch.attacks.slice(0, MAX_SKILLS);
      state.loadoutFor = ch.id;
    }
    $('loadoutWho').textContent = ch.name;
    const grid = $('skillGrid');
    grid.innerHTML = '';
    Object.keys(Oyun.attacks).forEach(function (id) {
      const def = Oyun.attacks[id];
      const b = document.createElement('button');
      b.className = 'skill';
      b.dataset.id = id;
      b.style.setProperty('--c', ch.color);
      const stars = Oyun.skillStars(def);
      b.innerHTML = '<span class="badge"></span><span class="ico"></span><span class="name"></span><span class="stats"></span>';
      b.querySelector('.ico').textContent = def.icon || '🤕';
      b.querySelector('.name').textContent = def.name;
      b.querySelector('.stats').textContent =
        '●●●●●'.slice(0, stars) + '○○○○○'.slice(0, 5 - stars) + ' · ' + (def.cooldown / 1000).toFixed(1).replace('.', ',') + ' sn';
      b.addEventListener('click', function () { toggleSkill(id); });
      grid.appendChild(b);
    });
    refreshLoadout();
    showScreen('loadout');
  }

  function toggleSkill(id) {
    const i = state.loadout.indexOf(id);
    if (i >= 0) state.loadout.splice(i, 1);
    else if (state.loadout.length < MAX_SKILLS) state.loadout.push(id);
    else return;
    Oyun.audio.play('click');
    refreshLoadout();
  }

  function refreshLoadout() {
    const full = state.loadout.length >= MAX_SKILLS;
    document.querySelectorAll('.skill').forEach(function (el) {
      const i = state.loadout.indexOf(el.dataset.id);
      el.classList.toggle('on', i >= 0);
      el.classList.toggle('full', full && i < 0);
      el.querySelector('.badge').textContent = i >= 0 ? i + 1 : '';
    });
    document.querySelectorAll('.btn.mode').forEach(function (el) {
      el.classList.toggle('on', el.dataset.mode === state.mode);
    });
    const f = $('btnFight');
    f.disabled = state.loadout.length === 0;
    f.textContent = state.loadout.length ? 'DÖVÜŞE BAŞLA ▶' : 'En az 1 yetenek seç';
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
    const INK = '#2b2b3a';

    // Duvar
    const grad = g.createLinearGradient(0, 0, 0, gy);
    grad.addColorStop(0, '#8ecae6'); grad.addColorStop(1, '#d8f3ff');
    g.fillStyle = grad;
    g.fillRect(-PAD, -PAD, W + PAD * 2, gy + PAD);
    g.fillStyle = 'rgba(255,255,255,.3)';
    for (let y = 40; y < gy; y += 90) {
      for (let x = ((y / 90) % 2) * 45; x < W + 45; x += 90) {
        g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
      }
    }

    g.lineWidth = 4; g.strokeStyle = INK; g.lineJoin = 'round';
    // Pencere (solda): gökyüzü, güneş, bulut
    const ww = Math.min(190, W * 0.26), wh = ww * 0.8, wx = W * 0.08, wy = Math.max(90, gy * 0.22);
    g.fillStyle = '#bdeaff'; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(wx + ww * 0.75, wy + wh * 0.3, ww * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(wx + ww * 0.3, wy + wh * 0.6, ww * 0.1, 0, Math.PI * 2);
    g.arc(wx + ww * 0.42, wy + wh * 0.52, ww * 0.13, 0, Math.PI * 2);
    g.arc(wx + ww * 0.55, wy + wh * 0.62, ww * 0.1, 0, Math.PI * 2);
    g.fill();
    g.strokeRect(wx, wy, ww, wh);
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(wx - 10, wy + wh, ww + 20, 12); g.strokeRect(wx - 10, wy + wh, ww + 20, 12);

    // Çerçeveli tablo (sağda): "EVİM EVİM"
    const fw = Math.min(150, W * 0.2), fh = fw * 0.7, fx = W * 0.92 - fw, fy = wy + 10;
    g.save();
    g.translate(fx + fw / 2, fy + fh / 2); g.rotate(0.06);
    g.fillStyle = '#fff7e0'; g.fillRect(-fw / 2, -fh / 2, fw, fh);
    g.lineWidth = 7; g.strokeStyle = '#b5651d'; g.strokeRect(-fw / 2, -fh / 2, fw, fh);
    g.fillStyle = '#ff5d8f';
    g.font = '900 ' + Math.round(fw * 0.16) + 'px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('EVİM EVİM', 0, -fh * 0.12);
    g.fillText('TATLI EVİM', 0, fh * 0.16);
    g.restore();

    // Saksı (sağ altta)
    const px = W * 0.9, pw = 34;
    g.lineWidth = 4; g.strokeStyle = INK;
    g.fillStyle = '#3ddc84';
    for (const a of [-0.6, 0, 0.6]) {
      g.save(); g.translate(px, gy - 44); g.rotate(a);
      g.beginPath(); g.ellipse(0, -30, 11, 32, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
    g.fillStyle = '#e76f51';
    g.beginPath(); g.moveTo(px - pw, gy - 46); g.lineTo(px + pw, gy - 46); g.lineTo(px + pw * 0.7, gy - 2); g.lineTo(px - pw * 0.7, gy - 2); g.closePath();
    g.fill(); g.stroke();

    // Zemin
    g.fillStyle = '#e09f3e';
    g.fillRect(-PAD, gy, W + PAD * 2, H - gy + PAD);
    g.fillStyle = '#c98628';
    for (let x = -PAD; x < W + PAD; x += 120) g.fillRect(x, gy, 4, H - gy + PAD);
    g.fillStyle = INK;
    g.fillRect(-PAD, gy - 2, W + PAD * 2, 5);
    state.bg = c;
  }

  function buildAttackBar() {
    const ch = state.char, wrap = $('attackButtons');
    wrap.innerHTML = '';
    state.cdEls = [];
    state.loadout.forEach(function (id, i) {
      const def = Oyun.attacks[id];
      const b = document.createElement('button');
      b.className = 'btn atk';
      b.style.setProperty('--c', ch.color);
      b.title = def.name;
      const key = document.createElement('kbd'); key.textContent = i + 1;
      const ico = document.createElement('span'); ico.className = 'ico';
      ico.textContent = def.icon || '🤕';
      const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = def.name;
      const cd = document.createElement('i'); cd.className = 'cd';
      b.appendChild(key); b.appendChild(ico); b.appendChild(lbl); b.appendChild(cd);
      b.addEventListener('click', function () { doAttack(i); b.blur(); });
      wrap.appendChild(b);
      state.cdEls.push({ btn: b, cd: cd, id: id });
    });
    const pc = $('attackerPortrait'), g = pc.getContext('2d');
    g.clearRect(0, 0, pc.width, pc.height);
    Oyun.drawPortrait(g, ch, pc.width / 2, pc.height / 2, pc.width / 2 - 6);
    $('attackerName').textContent = ch.name;
  }

  /* Raundu sıfırlar (puan, bekleme süreleri, süre) ve bebeği ayağa kaldırır. */
  function resetRound() {
    Oyun.effects.reset();
    Oyun.attackSystem.clear();
    Oyun.score.reset();
    Oyun.face.creamUntil = 0;
    state.cooldown = {};
    state.lastLaunch = 0;
    state.rageUntil = 0; state.raging = false;
    state.tornado = null;
    state.timeStart = 0; state.over = false; state.lastSecond = -1;
    state.lastBubble = performance.now();
    $('results').classList.remove('open');
    $('btnRage').hidden = true;
    $('rageTint').classList.remove('on');
    const timed = state.mode === 'timed';
    $('timerBox').hidden = !timed;
    $('timerBox').classList.remove('low');
    $('timerVal').textContent = ROUND_SECONDS;
    standUp();
    if (timed) toast('İlk vuruşla süre başlar!');
  }

  function startGame() {
    if (!state.char || !state.loadout.length) return;
    showScreen('game');
    Oyun.audio.init();
    Oyun.physics.init();
    setupOnce();
    resize();
    buildAttackBar();
    resetRound();
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
    $('results').classList.remove('open');
    showScreen('menu');
    drawFacePreview();
  }

  /* "Ayağa Kaldır": bebeği ekranın ortasında yeniden kurar (puan kalır). */
  function standUp() {
    Oyun.physics.releaseGrab();
    state.tornado = null;
    Oyun.ragdoll.build(state.W / 2, state.groundY, ragdollScale());
  }

  let didSetup = false;
  function setupOnce() {
    if (didSetup) return;
    didSetup = true;

    Oyun.physics.bindGrab(canvas, function () { return Oyun.ragdoll.bodies; }, {
      onGrab: function () { Oyun.ragdoll.setStanding(false); Oyun.ragdoll.disturb(); state.tornado = null; },
      onRelease: function () { Oyun.ragdoll.disturb(); },
    });

    Oyun.attackSystem.onImpact = onImpact;

    // Duvara / yere sert çarpınca küçük bonus
    M.Events.on(Oyun.physics.engine, 'collisionStart', function (ev) {
      const now = performance.now();
      if (state.over) return;
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

  function clampPos(x, y) {
    return { x: Math.max(110, Math.min(state.W - 110, x)), y: Math.max(120, Math.min(state.groundY - 30, y)) };
  }

  /* index: seçili yeteneklerdeki sıra. force: bekleme süresini yok say (çıldırma). */
  function doAttack(index, force) {
    const R = Oyun.ragdoll, now = performance.now();
    if (!state.running || state.over || !R.parts) return;
    const id = state.loadout[index];
    const def = Oyun.attacks[id];
    if (!def) return;
    const free = force || state.raging;
    if (!free && (now < (state.cooldown[id] || 0) || now - state.lastLaunch < MIN_GAP)) return;
    state.lastLaunch = now;
    state.cooldown[id] = now + def.cooldown;

    // Bebek hangi kenara yakınsa oradan vur ki ekranın geniş tarafına savrulsun
    const x = R.parts.torso.position.x;
    const side = x < state.W * 0.4 ? 1 : x > state.W * 0.6 ? -1 : (Math.random() < 0.5 ? 1 : -1);
    const getTarget = function () {
      if (!R.parts) return null;
      const p = R.parts[def.target].position;
      return { x: p.x, y: p.y };
    };
    const bounds = { W: state.W, groundY: state.groundY };
    const n = def.count || 1;
    for (let i = 0; i < n; i++) {
      Oyun.attackSystem.launch(id, state.char, getTarget, side, bounds, {
        delay: i * (def.stagger || 0),
        offX: n > 1 ? (Math.random() - 0.5) * 420 : 0,
        index: i,
      });
    }
    Oyun.audio.play(def.launchSound || 'whoosh');
  }

  /* Saldırı nesnesi hedefe değdiği an: fiziksel darbe + bütün efektler */
  function onImpact(a) {
    const R = Oyun.ragdoll, E = Oyun.effects;
    if (!R.parts || !a.hitPos || state.over) return;
    const def = a.def, s = a.side, now = performance.now();
    const big = !def.quiet;

    // --- Fiziksel darbe ---
    const power = def.power * (0.9 + Math.random() * 0.2) * Math.max(0.75, R.S);
    let dvx, dvy;
    if (def.dir === 'down') { dvx = (def.quiet ? (Math.random() - 0.5) * 2 : s * 0.25) * power; dvy = power; }
    else if (def.dir === 'up') { dvx = s * power * 0.2; dvy = -power * 1.1; }
    else { dvx = s * power; dvy = -power * (def.lift || 0.3); }
    R.hit(def.target, dvx, dvy, s * (def.spin || 0.3));
    R.daze(1500 + def.power * 30);
    R.flashUntil = now + 90;

    // --- Puan ---
    const base = def.damage * (state.raging ? 2 : 1);
    const res = a.index > 0 ? Oyun.score.add(Math.round(base)) : Oyun.score.hit(base, now);
    if (state.mode === 'timed' && !state.timeStart) state.timeStart = now;
    const pos = a.hitPos;

    // --- Efektler ---
    E.burst(pos.x, pos.y, big ? 6 + Math.round(def.power / 4) : 2);
    if (big) {
      E.shake(6 + def.power * 0.45);
      if (!state.raging) { // çıldırırken oyun hızlı aksın, duraklama olmasın
        E.freeze(40 + def.power);
        E.slowmo(110 + def.power * 5);
      }
      E.zoomPunch(0.015 + def.power * 0.0013);
      E.ring(pos.x, pos.y);
      const wp = clampPos(pos.x + s * 110, pos.y - 120 * R.S);
      E.popText(wp.x, wp.y, pick(def.words), 44 + def.power * 0.8, null, true);
    } else {
      E.shake(3);
      if (Math.random() < 0.5) E.popText(pos.x + (Math.random() - 0.5) * 120, pos.y - 60, pick(def.words), 28);
    }
    const dp = clampPos(pos.x - s * 70, pos.y - 110 * R.S);
    E.popText(dp.x, dp.y, '+' + res.gained, big ? 32 : 22, '#ffffff');
    if (res.combo >= 3 && res.combo % 5 === 0 && a.index === 0) {
      E.popText(state.W / 2, state.H * 0.36, 'KOMBO x' + res.combo + '!', 70, '#ffd23f', true);
    }

    // --- Yeteneğe özel etkiler ---
    if (def.fx === 'cream') {
      Oyun.face.creamUntil = now + 3800;
      E.splat(pos.x, pos.y, 16, ['#fffaf0', '#ffffff', '#ffd6e7']);
    } else if (def.fx === 'egg') {
      E.splat(pos.x, pos.y, 6, ['#ffffff', '#ffd23f']);
    } else if (def.fx === 'squash') {
      R.squashUntil = now + 550;
      E.shake(24);
    } else if (def.fx === 'tornado') {
      state.tornado = { until: now + 1700, x: Math.max(160, Math.min(state.W - 160, pos.x)), lastTick: now };
    }

    // --- Ses ve tepki ---
    Oyun.audio.play(def.sound);
    if (big && Math.random() < 0.4) Oyun.audio.play(Math.random() < 0.5 ? 'squeak' : 'yelp');
    if (res.combo >= 2 && a.index === 0) Oyun.audio.play('combo', res.combo);
    if (big && now - state.lastBubble > 1600 && Math.random() < 0.45) say(pick(OUCH));
    if (res.levelUp) announceLevel();
  }

  /* Bebeğin kafasının üstünde konuşma balonu */
  function say(text) {
    state.lastBubble = performance.now();
    Oyun.effects.bubble(text, function () {
      const R = Oyun.ragdoll;
      if (!R.parts) return null;
      const h = R.parts.head;
      return clampPos(h.position.x, h.position.y - h.rd.r - 8);
    });
  }

  /* Hortum: bir süre bebeği havada döndürür ve küçük puanlar verir. */
  function tornadoStep(now) {
    const T = state.tornado, R = Oyun.ragdoll;
    if (!T || !R.parts) return;
    if (now > T.until) { // bitti: bir yana fırlat
      const dir = Math.random() < 0.5 ? -1 : 1;
      R.hit('torso', dir * 16, -10, dir * 0.4);
      state.tornado = null;
      return;
    }
    R.setStanding(false);
    R.disturb();
    R.daze(600);
    const lift = R.parts.torso.position.y > state.groundY * 0.42 ? -1.6 : 0.6;
    R.bodies.forEach(function (b, i) {
      const dx = T.x - b.position.x;
      M.Body.setVelocity(b, {
        x: b.velocity.x * 0.9 + dx * 0.03 + Math.cos(now / 80 + i) * 1.6,
        y: b.velocity.y * 0.9 + lift,
      });
    });
    M.Body.setAngularVelocity(R.parts.torso, 0.3);
    if (now - T.lastTick > 220) {
      T.lastTick = now;
      const res = Oyun.score.add(state.raging ? 14 : 7);
      const p = R.parts.torso.position;
      Oyun.effects.burst(p.x, p.y, 2);
      if (res.levelUp) announceLevel();
    }
  }

  /* ==================== ÖFKE (ÇILDIRMA) ==================== */

  function startRage() {
    const now = performance.now();
    if (!state.running || state.over || state.raging || Oyun.score.rage < 100) return;
    state.raging = true;
    state.rageUntil = now + RAGE_MS;
    state.lastAuto = 0;
    Oyun.score.rage = 0;
    Oyun.score.rageLocked = true;
    $('btnRage').hidden = true;
    $('rageTint').classList.add('on');
    Oyun.audio.play('rage');
    Oyun.effects.popText(state.W / 2, state.H * 0.3, 'ÇILDIRDI!', 84, '#ff3d00', true);
    Oyun.effects.shake(18);
  }

  function updateRage(now) {
    if (state.raging) {
      if (now >= state.rageUntil || state.over) {
        state.raging = false;
        Oyun.score.rageLocked = false;
        $('rageTint').classList.remove('on');
        state.cooldown = {}; // çıldırma bitince yetenekler hazır olsun
      } else if (now - state.lastAuto > 220) { // kendiliğinden rastgele saldırılar (2x hasar)
        state.lastAuto = now;
        doAttack((Math.random() * state.loadout.length) | 0, true);
      }
    }
    $('btnRage').hidden = !(Oyun.score.rage >= 100 && !state.raging && !state.over);
  }

  /* ==================== SÜRE VE SONUÇ ==================== */

  function updateTimer(now) {
    if (state.mode !== 'timed' || state.over || !state.timeStart) return;
    const left = ROUND_SECONDS - (now - state.timeStart) / 1000;
    const sec = Math.max(0, Math.ceil(left));
    if (sec !== state.lastSecond) {
      state.lastSecond = sec;
      $('timerVal').textContent = sec;
      $('timerBox').classList.toggle('low', sec <= 10);
      if (sec <= 5 && sec > 0) Oyun.audio.play('tick');
    }
    if (left <= 0) endRound();
  }

  function endRound() {
    state.over = true;
    Oyun.attackSystem.clear();
    state.tornado = null;
    const S = Oyun.score;
    const record = S.points > state.best.timed;
    if (record) state.best.timed = S.points;
    let rank = RANKS[0][1];
    RANKS.forEach(function (r) { if (S.points >= r[0]) rank = r[1]; });
    $('resultScore').textContent = S.points;
    $('resultTitle').textContent = 'Unvanın: ' + rank;
    $('resultStats').textContent = 'Vuruş: ' + S.hits + ' · En iyi kombo: x' + S.bestCombo +
      (record ? ' · 🏆 Yeni rekor!' : ' · Rekor: ' + state.best.timed);
    $('results').classList.add('open');
    Oyun.audio.play('timeup');
  }

  /* ==================== ARAYÜZ GÜNCELLEMELERİ ==================== */

  function updateCooldowns(now) {
    for (const c of state.cdEls) {
      const def = Oyun.attacks[c.id];
      const left = state.raging ? 0 : Math.max(0, (state.cooldown[c.id] || 0) - now);
      c.cd.style.height = (left / def.cooldown) * 100 + '%';
      c.btn.classList.toggle('waiting', left > 0);
    }
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
    const ts = E.timeScale(now);          // ağır çekim (0 = vuruş anı duraklaması)
    E.update(realDt);

    if (ts > 0) {
      Oyun.attackSystem.update(realDt * ts);
      P.engine.timing.timeScale = ts;
      state.acc += realDt;
      let n = 0;
      while (state.acc >= STEP && n < 3) {
        tornadoStep(now);
        P.step(STEP, R.bodies);
        state.acc -= STEP; n++;
      }
      if (state.acc > STEP) state.acc = 0;
    } else {
      state.acc = 0;
    }

    // Güvenlik: bir parça ekrandan kaçarsa bebeği geri getir
    if (R.bodies.some(function (b) { return P.isOutside(b); })) standUp();

    R.update(now);
    Oyun.score.update(now);
    updateRage(now);
    updateTimer(now);
    updateCooldowns(now);

    // Uzun süre dokunulmazsa bebek laf atar
    if (!state.over && R.standing && now - state.lastBubble > 7000 && now - R.lastDisturb > 6000) say(pick(TAUNT));

    render(now);
  }

  function render(now) {
    const E = Oyun.effects, R = Oyun.ragdoll, d = state.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.globalAlpha = 1;
    ctx.save();
    E.applyShake(ctx, state.W, state.H);
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
    buildStyleChips();
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

    $('btnStart').addEventListener('click', openLoadout);
    $('btnBack').addEventListener('click', function () { showScreen('menu'); });
    $('btnFight').addEventListener('click', startGame);
    document.querySelectorAll('.btn.mode').forEach(function (el) {
      el.addEventListener('click', function () { state.mode = el.dataset.mode; Oyun.audio.play('click'); refreshLoadout(); });
    });

    $('btnMenu').addEventListener('click', backToMenu);
    $('btnStand').addEventListener('click', function (e) { standUp(); e.currentTarget.blur(); });
    $('btnMute').addEventListener('click', function (e) { toggleMute(); e.currentTarget.blur(); });
    $('btnRage').addEventListener('click', function (e) { startRage(); e.currentTarget.blur(); });
    $('btnAgain').addEventListener('click', resetRound);
    $('btnResMenu').addEventListener('click', backToMenu);

    window.addEventListener('resize', function () {
      if (!state.running) return;
      resize();
      standUp();
    });

    // Klavye: 1-4 yetenek, Boşluk çıldır, R ayağa kaldır, M ses, Esc menü
    window.addEventListener('keydown', function (e) {
      if (!state.running || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '9') {
        const i = parseInt(k, 10) - 1;
        if (i < state.loadout.length) doAttack(i);
      } else if (k === ' ' || e.code === 'Space') {
        e.preventDefault();
        startRage();
      } else if (k === 'r') {
        if (!state.over) standUp();
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
