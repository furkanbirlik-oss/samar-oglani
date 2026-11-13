/* ============================================================
   EFEKTLER
   Ekran sarsıntısı, "POW / ŞAK / BAM" yazıları, yıldızlar,
   çarpma halkası ve kısa ağır çekim.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const INK = '#2b2b3a';
  const TEXT_COLORS = ['#ffd23f', '#ff5d8f', '#3ddc84', '#4cc9f0', '#ff9f1c', '#ffffff'];
  const SLOW_SCALE = 0.22;  // ağır çekimde zamanın hızı
  const SLOW_EASE = 160;    // normale dönüş süresi (ms)

  function starPath(ctx, rad) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? rad : rad * 0.45;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawStar(ctx, x, y, rad, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    starPath(ctx, rad);
    ctx.fillStyle = color || '#ffd23f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, rad * 0.16);
    ctx.lineJoin = 'round';
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  const E = (Oyun.effects = {
    shakeMag: 0,
    texts: [],
    stars: [],
    rings: [],
    slowUntil: 0,

    reset: function () {
      this.shakeMag = 0; this.slowUntil = 0;
      this.texts.length = this.stars.length = this.rings.length = 0;
    },

    shake: function (mag) { this.shakeMag = Math.min(40, Math.max(this.shakeMag, mag)); },

    slowmo: function (ms) { this.slowUntil = Math.max(this.slowUntil, performance.now() + ms); },

    /* Oyun zamanının şu anki hızı (1 = normal) */
    timeScale: function (now) {
      if (now < this.slowUntil) return SLOW_SCALE;
      const k = (now - this.slowUntil) / SLOW_EASE;
      return k >= 1 ? 1 : SLOW_SCALE + (1 - SLOW_SCALE) * k;
    },

    /* Çizgi roman tarzı yazı patlaması */
    popText: function (x, y, text, size, color, burst) {
      this.texts.push({
        x: x, y: y, text: text, size: size || 60,
        color: color || TEXT_COLORS[(Math.random() * TEXT_COLORS.length) | 0],
        rot: (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 0.08, vy: -0.07,
        age: 0, life: burst ? 850 : 700, burst: !!burst,
      });
    },

    /* Etrafa saçılan yıldızlar */
    burst: function (x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 0.25 + Math.random() * 0.5;
        this.stars.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.25,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.02,
          rad: 7 + Math.random() * 9, age: 0, life: 500 + Math.random() * 400,
          color: Math.random() < 0.7 ? '#ffd23f' : '#ffffff',
        });
      }
    },

    ring: function (x, y) { this.rings.push({ x: x, y: y, age: 0, life: 260 }); },

    update: function (dt) {
      this.shakeMag *= Math.pow(0.9, dt / 16.7);
      if (this.shakeMag < 0.3) this.shakeMag = 0;

      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.age += dt; t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.age > t.life) this.texts.splice(i, 1);
      }
      for (let i = this.stars.length - 1; i >= 0; i--) {
        const s = this.stars[i];
        s.age += dt; s.vy += 0.0012 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
        if (s.age > s.life) this.stars.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        this.rings[i].age += dt;
        if (this.rings[i].age > this.rings[i].life) this.rings.splice(i, 1);
      }
    },

    /* Sarsıntı için tüm sahneyi kaydırır (ctx.save/restore arasında çağır). */
    applyShake: function (ctx) {
      if (!this.shakeMag) return;
      ctx.translate((Math.random() - 0.5) * 2 * this.shakeMag, (Math.random() - 0.5) * 2 * this.shakeMag);
    },

    /* Sersemken kafanın etrafında dönen yıldızlar */
    drawHeadStars: function (ctx, x, y, r, t, count) {
      for (let i = 0; i < count; i++) {
        const a = t * 5 + (i / count) * Math.PI * 2;
        const sx = x + Math.cos(a) * r * 1.25;
        const sy = y - r * 1.15 + Math.sin(a) * r * 0.32;
        const depth = 0.75 + 0.25 * Math.sin(a); // arkadakiler küçük görünsün
        drawStar(ctx, sx, sy, r * 0.26 * depth, a, '#ffd23f');
      }
    },

    draw: function (ctx) {
      // Çarpma halkaları
      for (const g of this.rings) {
        const k = g.age / g.life;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')';
        ctx.lineWidth = 10 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(g.x, g.y, 20 + k * 110, 0, Math.PI * 2); ctx.stroke();
      }
      // Yıldızlar
      for (const s of this.stars) {
        ctx.globalAlpha = Math.min(1, (1 - s.age / s.life) * 2);
        drawStar(ctx, s.x, s.y, s.rad, s.rot, s.color);
      }
      ctx.globalAlpha = 1;
      // Yazılar
      for (const t of this.texts) {
        const k = t.age / t.life;
        // 0.3'ten fırla, hafif taş, yerine otur
        let sc = t.age < 110 ? 0.3 + (t.age / 110) * 0.95 : Math.max(1, 1.25 - (t.age - 110) / 400);
        ctx.save();
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.scale(sc, sc);
        ctx.font = '900 ' + t.size + 'px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        if (t.burst) { // arkadaki dikenli patlama balonu
          const w = ctx.measureText(t.text).width / 2 + t.size * 0.45, h = t.size * 0.85;
          ctx.beginPath();
          const spikes = 14;
          for (let i = 0; i < spikes * 2; i++) {
            const a = (i / (spikes * 2)) * Math.PI * 2;
            const m = i % 2 === 0 ? 1.18 : 0.86;
            ctx.lineTo(Math.cos(a) * w * m, Math.sin(a) * h * m);
          }
          ctx.closePath();
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 5;
          ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = t.size * 0.2;
        ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.burst && t.color === '#ffffff' ? '#ff5d8f' : t.color;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
    },
  });
})();
