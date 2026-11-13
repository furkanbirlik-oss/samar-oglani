/* ============================================================
   YÜZ
   - Yüklenen fotoğraf sadece burada, bellekteki bir canvas olarak durur.
     Hiçbir yere gönderilmez, localStorage dahil hiçbir yere kaydedilmez.
   - Fotoğraf yoksa varsayılan komik yüz çizilir.
   - Hasar seviyesine göre süsler eklenir (yara bandı, morluk, şaşı göz...).
   Tüm ölçüler kafa yarıçapı (r) cinsindendir; gözlerin
   (±0.36r, -0.15r) noktasında olduğu varsayılır.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const INK = '#2b2b3a';
  const EYE_X = 0.36, EYE_Y = -0.15;

  const F = (Oyun.face = {
    photo: null,          // kafaya çizilen (filtrelenmiş) fotoğraf ya da null
    photoOriginal: null,  // kırpılmış ama filtresiz hali (stil değiştirmek için)
    style: 'cizgi',       // seçili çizim stili (bkz. js/cartoon.js)
    creamUntil: 0,        // yüzde krema bu ana kadar durur

    aiPhoto: null,        // yapay zekâ ile anime'ye çevrilmiş hali (hazırsa)

    setPhoto: function (canvas) { this.photoOriginal = canvas; this.aiPhoto = null; this.restyle(); },
    setStyle: function (id) { this.style = id; this.restyle(); },
    restyle: function () {
      if (!this.photoOriginal) this.photo = null;
      else if (this.style === 'animeyz') this.photo = this.aiPhoto || this.photoOriginal; // çevirme bitene kadar aslı
      else this.photo = Oyun.cartoon.apply(this.photoOriginal, this.style);
    },
    clearPhoto: function () { this.photo = null; this.photoOriginal = null; this.aiPhoto = null; },

    /* Yüzü (0,0) merkezli r yarıçaplı daireye çizer.
       state: { level: 0-5, dazed: true/false, t: saniye } */
    draw: function (ctx, r, state) {
      state = state || {};
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();

      if (this.photo) ctx.drawImage(this.photo, -r, -r, 2 * r, 2 * r);
      else drawDefault(ctx, r, !!state.dazed);
      this.drawOverlays(ctx, r, state);
      ctx.restore();
    },

    /* Hasar süsleri ve krema. Gözlerin (±0.36r, -0.15r) noktasında olduğunu varsayar;
       tam boy fotoğraf modunda bodyskin.js bunu gerçek göz konumuna taşıyarak çağırır. */
    drawOverlays: function (ctx, r, state) {
      state = state || {};
      const level = state.level || 0;
      const dazed = !!state.dazed;
      const t = state.t || 0;
      ctx.save();
      if (level >= 2) blackEye(ctx, r);
      if (level >= 5 || dazed) {
        spiralEye(ctx, -EYE_X * r, EYE_Y * r, r * 0.22, t * 9);
        spiralEye(ctx, EYE_X * r, EYE_Y * r, r * 0.22, -t * 9);
      } else if (level >= 3) {
        googlyEye(ctx, -1, r);
        googlyEye(ctx, 1, r);
      }
      if (level >= 1) bandAid(ctx, r * 0.32, -r * 0.62, -0.45, r * 0.56, r * 0.2);
      if (level >= 4) {
        bandAid(ctx, r * 0.52, r * 0.38, 0.7, r * 0.46, r * 0.16);
        bandAid(ctx, r * 0.52, r * 0.38, -0.7, r * 0.46, r * 0.16);
      }
      // Pasta yediyse yüz bir süre krema içinde kalır
      const creamLeft = this.creamUntil - performance.now();
      if (creamLeft > 0 && state.cream !== false) cream(ctx, r, Math.min(1, creamLeft / 900));
      ctx.restore();
    },

    /* Kafanın üstündeki şişlik (kafadan ÖNCE çizilir, level >= 4) */
    drawBump: function (ctx, r, t) {
      const s = 1 + Math.sin(t * 6) * 0.05;
      ctx.save();
      ctx.translate(-r * 0.38, -r * 0.86);
      ctx.scale(s, s);
      ctx.fillStyle = '#ff8fa3';
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  });

  /* ---------- Varsayılan komik yüz ---------- */
  function drawDefault(ctx, r, dazed) {
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';

    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-r, -r, 2 * r, 2 * r);

    // Yanaklar
    ctx.fillStyle = 'rgba(255,110,110,.45)';
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sx * r * 0.62, r * 0.28, r * 0.18, 0, Math.PI * 2); ctx.fill();
    }

    // Gözler (hafif şaşı) + kaşlar
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(sx * EYE_X * r, EYE_Y * r, r * 0.2, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(sx * (EYE_X - 0.07) * r, (EYE_Y + 0.05) * r, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.58, -r * (dazed ? 0.6 : 0.52));
      ctx.lineTo(sx * r * 0.18, -r * (dazed ? 0.5 : 0.58));
      ctx.stroke();
    }

    // Patates burun
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    if (dazed) {
      // "Oooo" ağzı + dil
      ctx.fillStyle = '#7a1f1f';
      ctx.beginPath(); ctx.ellipse(0, r * 0.56, r * 0.17, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff6b8b';
      ctx.beginPath(); ctx.ellipse(r * 0.04, r * 0.68, r * 0.1, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      // Tavşan dişli sırıtış
      ctx.fillStyle = '#7a1f1f';
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.45, Math.PI * 0.1, Math.PI * 0.9);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.rect(-r * 0.13, r * 0.44, r * 0.13, r * 0.15); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(0, r * 0.44, r * 0.13, r * 0.15); ctx.fill(); ctx.stroke();
    }
  }

  /* ---------- Süsler ---------- */
  function bandAid(ctx, x, y, rot, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#f6cfa3';
    ctx.strokeStyle = '#b98558';
    ctx.lineWidth = Math.max(1, h * 0.12);
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9b683';
    ctx.fillRect(-w * 0.16, -h / 2, w * 0.32, h);
    ctx.fillStyle = '#b98558';
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.beginPath(); ctx.arc(sx * w * 0.32, sy * h * 0.18, h * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function cream(ctx, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = '#e8c9d6';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    const blobs = [[0, 0.1, 0.62], [-0.45, -0.2, 0.36], [0.42, -0.25, 0.34], [-0.3, 0.5, 0.34], [0.38, 0.48, 0.3], [0, -0.5, 0.3]];
    ctx.beginPath();
    for (const b of blobs) { ctx.moveTo(b[0] * r + b[2] * r, b[1] * r); ctx.arc(b[0] * r, b[1] * r, b[2] * r, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5d8f'; // tepesindeki kiraz
    ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.35, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function blackEye(ctx, r) {
    const x = -EYE_X * r, y = EYE_Y * r;
    const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r * 0.38);
    g.addColorStop(0, 'rgba(90,40,140,.75)');
    g.addColorStop(0.7, 'rgba(90,40,140,.5)');
    g.addColorStop(1, 'rgba(90,40,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }

  function googlyEye(ctx, sx, r) {
    const x = sx * EYE_X * r, y = EYE_Y * r;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    // Göz bebekleri buruna doğru: şaşı
    ctx.beginPath(); ctx.arc(x - sx * r * 0.1, y + r * 0.05, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  function spiralEye(ctx, x, y, rad, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, rad * 0.22);
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(rot);
    ctx.lineWidth = Math.max(1.2, rad * 0.16);
    ctx.beginPath();
    const turns = 2.5, steps = 40;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * turns * Math.PI * 2;
      const rr = (i / steps) * rad * 0.8;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  Oyun.roundRect = roundRect;
})();
