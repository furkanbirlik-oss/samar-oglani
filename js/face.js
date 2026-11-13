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
    photo: null, // kırpılmış fotoğraf (canvas) ya da null

    setPhoto: function (canvas) { this.photo = canvas; },
    clearPhoto: function () { this.photo = null; },

    /* Yüzü (0,0) merkezli r yarıçaplı daireye çizer.
       state: { level: 0-5, dazed: true/false, t: saniye } */
    draw: function (ctx, r, state) {
      state = state || {};
      const level = state.level || 0;
      const dazed = !!state.dazed;
      const t = state.t || 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();

      if (this.photo) ctx.drawImage(this.photo, -r, -r, 2 * r, 2 * r);
      else drawDefault(ctx, r, dazed);

      // --- Hasar süsleri ---
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
