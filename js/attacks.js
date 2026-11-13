/* ============================================================
   YETENEKLER (SALDIRILAR)
   Bütün yetenekler tek bir havuzda durur; oyuncu oyuna girerken
   bu havuzdan en fazla 4 tanesini seçer.

   Yeni yetenek eklemek için Oyun.attacks içine bir kayıt ekle;
   seçim ekranında kendiliğinden görünür. Alanlar:
     name      : görünen ad
     icon      : uçan nesne (emoji). null ise sadece karakterin kafası gelir
     usePortrait: true ise karakterin portresi de saldırıya katılır
     facesLeft : emoji sola bakıyorsa true (soldan gelirken aynalanır)
     words     : çarpınca çıkan yazılar (rastgele biri)
     sound     : çarpma sesi (js/audio.js içindeki ad)
     launchSound: fırlatma sesi (yazılmazsa 'whoosh')
     target    : 'head' ya da 'torso'
     power     : savurma gücü (yaklaşık 10 hafif - 35 çok sert)
     lift      : yukarı kaldırma oranı (yana vuruşlarda)
     spin      : döndürme
     damage    : temel hasar puanı
     cooldown  : tekrar kullanmadan önceki bekleme (ms)
     anim      : 'swing' savurma | 'jab' düz | 'throw' fırlatma | 'dash' dalış
                 | 'drop' tepeden düşme | 'uppercut' alttan vuruş
     dir       : darbenin yönü: yazılmazsa yana, 'down' aşağı, 'up' yukarı
     count     : art arda kaç tane geleceği (yağmur tipi yetenekler)
     stagger   : count için aradaki süre (ms)
     quiet     : true ise küçük efekt (yağmur taneleri için)
     fx        : özel etki: 'cream' yüze krema | 'egg' sarı sıçrama
                 | 'squash' yassılma | 'tornado' havada döndürme
     duration  : nesnenin hedefe varma süresi (ms)
     size      : nesnenin boyutu (piksel)
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});

  Oyun.attacks = {
    // --- Klasikler ---
    tokat:  { name: 'Tokat', icon: '🖐️', words: ['ŞAK!', 'ŞAP!', 'ÇAT!'], sound: 'slap',
              target: 'head', power: 17, lift: 0.3, spin: 0.3, damage: 25, cooldown: 300, anim: 'swing', duration: 150, size: 78 },
    terlik: { name: 'Terlik', icon: '🩴', words: ['ŞAK!', 'PAT!', 'FIYUU-ŞAK!'], sound: 'slipper',
              target: 'head', power: 21, lift: 0.25, spin: 0.4, damage: 35, cooldown: 600, anim: 'throw', duration: 300, size: 66 },
    tekme:  { name: 'Tekme', icon: '🦵', facesLeft: true, words: ['BAM!', 'GÜM!', 'KÜT!'], sound: 'kick',
              target: 'torso', power: 25, lift: 0.7, spin: 0.2, damage: 40, cooldown: 800, anim: 'swing', duration: 170, size: 96 },
    canta:  { name: 'Çanta', icon: '👜', words: ['PAF!', 'BAM!', 'ÇAT!'], sound: 'bag',
              target: 'head', power: 23, lift: 0.4, spin: 0.45, damage: 38, cooldown: 700, anim: 'swing', duration: 190, size: 90 },
    yumruk: { name: 'Yumruk', icon: '👊', words: ['POW!', 'BAM!', 'DAN!'], sound: 'punch',
              target: 'head', power: 23, lift: 0.3, spin: 0.25, damage: 36, cooldown: 600, anim: 'jab', duration: 130, size: 80 },
    tava:   { name: 'Tava', icon: '🍳', words: ['DONNG!', 'TANG!', 'ÇINN!'], sound: 'pan',
              target: 'head', power: 27, lift: 0.25, spin: 0.5, damage: 50, cooldown: 1200, anim: 'swing', duration: 210, size: 100 },
    kafa:   { name: 'Kafa At', icon: null, usePortrait: true, words: ['TOK!', 'KÜT!', 'GONK!'], sound: 'headbutt',
              target: 'head', power: 25, lift: 0.3, spin: 0.3, damage: 45, cooldown: 1000, anim: 'dash', duration: 240, size: 92 },
    ucantekme: { name: 'Uçan Tekme', icon: '👟', facesLeft: true, usePortrait: true, words: ['HAYYAA!', 'BAM!', 'GÜÜM!'], sound: 'flykick',
              target: 'torso', power: 34, lift: 0.55, spin: 0.35, damage: 60, cooldown: 1800, anim: 'dash', duration: 300, size: 92 },

    // --- Yeni yetenekler ---
    supurge: { name: 'Süpürge', icon: '🧹', words: ['FIŞŞT!', 'PAT!', 'ŞAAK!'], sound: 'broom',
              target: 'torso', power: 24, lift: 0.4, spin: 0.4, damage: 42, cooldown: 900, anim: 'swing', duration: 200, size: 120 },
    top:    { name: 'Top Şutu', icon: '⚽', words: ['GOOOL!', 'POK!', 'DAN!'], sound: 'ball',
              target: 'head', power: 28, lift: 0.3, spin: 0.5, damage: 48, cooldown: 1100, anim: 'throw', duration: 260, size: 64 },
    pasta:  { name: 'Pasta', icon: '🎂', words: ['PLÖP!', 'ŞLAP!', 'AFİYET OLSUN!'], sound: 'cream', fx: 'cream',
              target: 'head', power: 12, lift: 0.2, spin: 0.15, damage: 30, cooldown: 1500, anim: 'throw', duration: 320, size: 84 },
    eldiven: { name: 'Yaylı Eldiven', icon: '🥊', words: ['BOİNG!', 'APARKAT!', 'HOP!'], sound: 'spring', dir: 'up',
              target: 'torso', power: 30, spin: 0.3, damage: 55, cooldown: 1600, anim: 'uppercut', duration: 180, size: 96 },
    yumurta: { name: 'Yumurta Yağmuru', icon: '🥚', words: ['ÇAT!', 'ŞPLAT!', 'ÇIT!'], sound: 'splat', fx: 'egg', dir: 'down',
              count: 6, stagger: 110, quiet: true,
              target: 'head', power: 9, spin: 0.2, damage: 12, cooldown: 2200, anim: 'drop', duration: 380, size: 46 },
    piyano: { name: 'Piyano', icon: '🎹', words: ['DLANNG!', 'GÜÜÜM!', 'TINNN!'], sound: 'piano', launchSound: 'whistle', fx: 'squash', dir: 'down',
              target: 'head', power: 30, spin: 0.1, damage: 80, cooldown: 3500, anim: 'drop', duration: 520, size: 150 },
    hortum: { name: 'Hortum', icon: '🌪️', words: ['VIJJJ!', 'FIRRR!'], sound: 'wind', fx: 'tornado',
              target: 'torso', power: 10, lift: 1, spin: 0.6, damage: 30, cooldown: 5000, anim: 'dash', duration: 350, size: 140 },
  };

  /* Seçim ekranındaki "Güç" noktaları (1-5) */
  Oyun.skillStars = function (def) {
    const total = def.damage * (def.count || 1);
    return total <= 28 ? 1 : total <= 40 ? 2 : total <= 50 ? 3 : total <= 65 ? 4 : 5;
  };

  const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const AFTER = 220; // çarpmadan sonra nesnenin ekranda kaldığı süre (ms)

  /* Nesnenin başlangıç ve bitiş noktası (hedef hareket ettikçe güncellenir) */
  function geometry(a, tg) {
    const def = a.def, s = a.side;
    if (def.anim === 'drop') {
      const end = { x: tg.x, y: tg.y - def.size * 0.45 };
      return { start: { x: tg.x + a.offX, y: -140 }, end: end };
    }
    if (def.anim === 'uppercut') {
      const end = { x: tg.x, y: tg.y + def.size * 0.45 };
      return { start: { x: tg.x - s * 40, y: a.floorY + 110 }, end: end };
    }
    const end = { x: tg.x - s * def.size * 0.45, y: tg.y }; // hedefin biraz gerisinde dur
    return { start: a.from || { x: end.x + a.rel.x, y: end.y + a.rel.y }, end: end };
  }

  /* Uçan saldırı nesnelerini yönetir. Çarpma anında onImpact çağrılır;
     asıl fiziksel darbe ve efektler main.js içinde verilir. */
  Oyun.attackSystem = {
    active: [],
    onImpact: null,

    /* id: yetenek kimliği, ch: karakter, getTarget(): hedefin anlık konumu,
       side: +1 soldan gelir (sağa savurur), -1 sağdan gelir,
       bounds: { W, groundY }, opts: { delay, offX, index } */
    launch: function (id, ch, getTarget, side, bounds, opts) {
      const def = Oyun.attacks[id];
      const tg = getTarget();
      if (!def || !tg) return null;
      opts = opts || {};
      const a = {
        def: def, ch: ch, side: side, t: 0, hit: false, after: 0,
        getTarget: getTarget, hitPos: null,
        delay: opts.delay || 0, offX: opts.offX || 0, index: opts.index || 0,
        floorY: bounds.groundY,
      };
      if (def.anim === 'throw' || def.anim === 'dash') {
        a.from = { x: side > 0 ? -90 : bounds.W + 90, y: tg.y - 60 };   // ekran dışından
      } else if (def.anim === 'swing' || def.anim === 'jab') {
        a.rel = { x: -side * 190, y: def.anim === 'jab' ? -10 : -70 };  // hedefin yanından
      }
      this.active.push(a);
      return a;
    },

    update: function (dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
        if (a.delay > 0) { a.delay -= dt; continue; }
        if (!a.hit) {
          a.t += dt / a.def.duration;
          if (a.t >= 1) {
            a.t = 1;
            a.hit = true;
            a.hitPos = a.getTarget();
            if (this.onImpact) this.onImpact(a);
          }
        } else {
          a.after += dt;
          if (a.after > AFTER) this.active.splice(i, 1);
        }
      }
    },

    clear: function () { this.active.length = 0; },

    draw: function (ctx) {
      for (let i = 0; i < this.active.length; i++) {
        const a = this.active[i], def = a.def, s = a.side;
        if (a.delay > 0) continue;
        const tg = a.hit ? a.hitPos : a.getTarget();
        if (!tg) continue;
        const geo = geometry(a, tg), start = geo.start, end = geo.end;
        const p = def.anim === 'throw' ? a.t : a.t * a.t;
        let x = start.x + (end.x - start.x) * p;
        let y = start.y + (end.y - start.y) * p;
        let rot = 0, alpha = 1;

        if (def.anim === 'swing') { y -= Math.sin(p * Math.PI) * 50; rot = s * (-1.3 + 1.8 * p); }
        if (def.anim === 'throw') { y -= Math.sin(p * Math.PI) * 40; rot = s * a.t * 14; }
        if (def.anim === 'dash') rot = def.fx === 'tornado' ? Math.sin(a.t * 30) * 0.2 : s * 0.25;
        if (def.anim === 'drop') rot = Math.sin(a.t * 9 + a.offX) * 0.15;
        if (a.hit) { // geldiği yöne doğru geri sekme + silinme
          const k = a.after / AFTER;
          const dx = end.x - start.x, dy = end.y - start.y, len = Math.hypot(dx, dy) || 1;
          x -= (dx / len) * k * 60; y -= (dy / len) * k * 60;
          alpha = 1 - k;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if ((def.anim === 'dash' || def.anim === 'drop') && !a.hit && !def.quiet) { // hız çizgileri
          const dx = end.x - start.x, dy = end.y - start.y, len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len;
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 5; ctx.lineCap = 'round';
          for (let j = -1; j <= 1; j++) {
            const ox = -uy * j * 26, oy = ux * j * 26, L = 150 + (j === 0 ? 50 : 0);
            ctx.beginPath();
            ctx.moveTo(x - ux * 70 + ox, y - uy * 70 + oy);
            ctx.lineTo(x - ux * L + ox, y - uy * L + oy);
            ctx.stroke();
          }
        }

        ctx.translate(x, y);
        ctx.rotate(rot);
        if (def.usePortrait) {
          Oyun.drawPortrait(ctx, a.ch, -s * (def.icon ? def.size * 0.55 : 0), def.icon ? -def.size * 0.3 : 0, def.size * 0.5);
        }
        if (def.icon) {
          if (def.facesLeft && s > 0) ctx.scale(-1, 1);
          ctx.font = def.size + 'px ' + EMOJI_FONT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(def.icon, 0, 0);
        }
        ctx.restore();
      }
    },
  };
})();
