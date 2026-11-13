/* ============================================================
   SALDIRILAR
   Yeni saldırı eklemek için Oyun.attacks içine bir kayıt ekle,
   sonra js/characters.js içinde bir karakterin attacks listesine
   kimliğini yaz. Alanlar:
     name      : butonda görünen ad
     icon      : uçan nesne (emoji). null ise sadece karakterin kafası gelir
     usePortrait: true ise karakterin portresi de saldırıya katılır
     facesLeft : emoji sola bakıyorsa true (soldan gelirken aynalanır)
     words     : çarpınca çıkan yazılar (rastgele biri)
     sound     : js/audio.js içindeki ses adı
     target    : 'head' ya da 'torso' (bebeğin hangi parçasına vurulacak)
     power     : savurma gücü (yaklaşık 15 hafif - 35 çok sert)
     lift      : yukarı kaldırma oranı (0 = dümdüz, 1 = 45 derece yukarı)
     spin      : döndürme
     damage    : temel hasar puanı
     anim      : 'swing' (savurma) | 'jab' (düz) | 'throw' (fırlatma) | 'dash' (ekran dışından dalış)
     duration  : nesnenin hedefe varma süresi (ms)
     size      : nesnenin boyutu (piksel)
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});

  Oyun.attacks = {
    // --- Rabia ---
    tokat:  { name: 'Tokat', icon: '🖐️', words: ['ŞAK!', 'ŞAP!', 'ÇAT!'], sound: 'slap',
              target: 'head', power: 17, lift: 0.3, spin: 0.3, damage: 25, anim: 'swing', duration: 150, size: 78 },
    terlik: { name: 'Terlik Fırlat', icon: '🩴', words: ['ŞAK!', 'PAT!', 'FIYUU-ŞAK!'], sound: 'slipper',
              target: 'head', power: 21, lift: 0.25, spin: 0.4, damage: 35, anim: 'throw', duration: 300, size: 66 },
    // --- Pınar ---
    tekme:  { name: 'Tekme', icon: '🦵', facesLeft: true, words: ['BAM!', 'GÜM!', 'KÜT!'], sound: 'kick',
              target: 'torso', power: 25, lift: 0.7, spin: 0.2, damage: 40, anim: 'swing', duration: 170, size: 96 },
    canta:  { name: 'Çanta Savur', icon: '👜', words: ['PAF!', 'BAM!', 'ÇAT!'], sound: 'bag',
              target: 'head', power: 23, lift: 0.4, spin: 0.45, damage: 38, anim: 'swing', duration: 190, size: 90 },
    // --- Çiğdem ---
    yumruk: { name: 'Yumruk', icon: '👊', words: ['POW!', 'BAM!', 'DAN!'], sound: 'punch',
              target: 'head', power: 23, lift: 0.3, spin: 0.25, damage: 36, anim: 'jab', duration: 130, size: 80 },
    tava:   { name: 'Tava', icon: '🍳', words: ['DONNG!', 'TANG!', 'ÇINN!'], sound: 'pan',
              target: 'head', power: 27, lift: 0.25, spin: 0.5, damage: 50, anim: 'swing', duration: 210, size: 100 },
    // --- Furkan ---
    kafa:      { name: 'Kafa At', icon: null, usePortrait: true, words: ['TOK!', 'KÜT!', 'GONK!'], sound: 'headbutt',
                 target: 'head', power: 25, lift: 0.3, spin: 0.3, damage: 45, anim: 'dash', duration: 240, size: 92 },
    ucantekme: { name: 'Uçan Tekme', icon: '👟', facesLeft: true, usePortrait: true, words: ['HAYYAA!', 'BAM!', 'GÜÜM!'], sound: 'flykick',
                 target: 'torso', power: 34, lift: 0.55, spin: 0.35, damage: 60, anim: 'dash', duration: 300, size: 92 },
  };

  const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const AFTER = 220; // çarpmadan sonra nesnenin ekranda kaldığı süre (ms)

  /* Uçan saldırı nesnelerini yönetir. Çarpma anında onImpact çağrılır;
     asıl fiziksel darbe ve efektler main.js içinde verilir. */
  Oyun.attackSystem = {
    active: [],
    lastLaunch: 0,
    onImpact: null,

    /* id: saldırı kimliği, ch: karakter, getTarget(): hedefin anlık konumu,
       side: +1 soldan gelir (sağa savurur), -1 sağdan gelir. */
    launch: function (id, ch, getTarget, side, W) {
      const def = Oyun.attacks[id];
      const now = performance.now();
      if (!def || now - this.lastLaunch < 170) return false;
      this.lastLaunch = now;
      const tg = getTarget();
      const a = { def: def, ch: ch, side: side, t: 0, hit: false, after: 0, getTarget: getTarget, hitPos: null };
      if (def.anim === 'throw' || def.anim === 'dash') {
        a.from = { x: side > 0 ? -90 : W + 90, y: tg.y - 60 };          // ekran dışından
      } else {
        a.rel = { x: -side * 190, y: def.anim === 'jab' ? -10 : -70 };  // hedefin yanından
      }
      this.active.push(a);
      return true;
    },

    update: function (dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
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
        const tg = a.hit ? a.hitPos : a.getTarget();
        if (!tg) continue;
        // Nesnenin merkezi hedefin biraz gerisinde durur
        const end = { x: tg.x - s * def.size * 0.45, y: tg.y };
        const start = a.from || { x: end.x + a.rel.x, y: end.y + a.rel.y };
        const p = def.anim === 'throw' ? a.t : a.t * a.t;
        let x = start.x + (end.x - start.x) * p;
        let y = start.y + (end.y - start.y) * p;
        let rot = 0, alpha = 1;

        if (def.anim === 'swing') { y -= Math.sin(p * Math.PI) * 50; rot = s * (-1.3 + 1.8 * p); }
        if (def.anim === 'throw') { y -= Math.sin(p * Math.PI) * 40; rot = s * a.t * 14; }
        if (def.anim === 'dash') rot = s * 0.25;
        if (a.hit) { // geri sekme + silinme
          const k = a.after / AFTER;
          x -= s * k * 60; y -= k * 20;
          alpha = 1 - k;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (def.anim === 'dash' && !a.hit) { // hız çizgileri
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 5; ctx.lineCap = 'round';
          for (let j = -1; j <= 1; j++) {
            ctx.beginPath();
            ctx.moveTo(x - s * 70, y + j * 26);
            ctx.lineTo(x - s * (150 + (j === 0 ? 50 : 0)), y + j * 26);
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
