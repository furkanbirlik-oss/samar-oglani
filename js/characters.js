/* ============================================================
   KARAKTERLER
   Yeni karakter eklemek için aşağıdaki listeye bir satır ekle.
   - image: null ise çizgi film yer tutucu çizilir.
            Gerçek fotoğraf için: image: 'assets/characters/rabia.png'
   - attacks: js/attacks.js içindeki saldırı kimlikleri (sırayla 1, 2, ... tuşları)
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});

  Oyun.characters = [
    { id: 'rabia',  name: 'Rabia',  color: '#ff5d8f', skin: '#ffd9b8', hair: '#5a2d0c', hairStyle: 'long',  image: null, attacks: ['tokat', 'terlik'] },
    { id: 'pinar',  name: 'Pınar',  color: '#9b5de5', skin: '#f6c9a0', hair: '#1d1d24', hairStyle: 'bun',   image: null, attacks: ['tekme', 'canta'] },
    { id: 'cigdem', name: 'Çiğdem', color: '#06b6a4', skin: '#ffe0c2', hair: '#d98b2b', hairStyle: 'curly', image: null, attacks: ['yumruk', 'tava'] },
    { id: 'furkan', name: 'Furkan', color: '#3a86ff', skin: '#eebc92', hair: '#2b1a10', hairStyle: 'short', image: null, attacks: ['kafa', 'ucantekme'] },
  ];

  /* image alanı dolu olan karakterlerin resimlerini yükler.
     Her resim yüklendiğinde onLoad çağrılır (kartları yeniden çizmek için). */
  Oyun.loadCharacterImages = function (onLoad) {
    Oyun.characters.forEach(function (ch) {
      if (!ch.image) return;
      const img = new Image();
      img.onload = function () { ch._img = img; if (onLoad) onLoad(ch); };
      img.onerror = function () { console.warn('Karakter resmi yüklenemedi:', ch.image); };
      img.src = ch.image;
    });
  };

  /* Karakter portresini (cx, cy) merkezli, r yarıçaplı daire içine çizer. */
  Oyun.drawPortrait = function (ctx, ch, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();

    if (ch._img) {
      // Gerçek fotoğraf: daireyi kaplayacak şekilde ortala
      const iw = ch._img.naturalWidth, ih = ch._img.naturalHeight;
      const s = (2 * r) / Math.min(iw, ih);
      ctx.drawImage(ch._img, -iw * s / 2, -ih * s / 2, iw * s, ih * s);
    } else {
      drawCartoon(ctx, ch, r);
    }
    ctx.restore();

    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = '#2b2b3a';
    ctx.stroke();
    ctx.restore();
  };

  function circle(ctx, x, y, rad) {
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
  }

  /* Çizgi film yer tutucu yüz */
  function drawCartoon(ctx, ch, r) {
    const fy = r * 0.12;       // yüz merkezi
    const fr = r * 0.6;        // yüz yarıçapı
    const lw = Math.max(1.5, r * 0.05);

    ctx.fillStyle = ch.color;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    circle(ctx, -r * 0.4, -r * 0.5, r * 0.7); ctx.fill();

    ctx.strokeStyle = '#2b2b3a';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';

    // Saç (arkada)
    ctx.fillStyle = ch.hair;
    if (ch.hairStyle === 'long') {
      ctx.beginPath();
      ctx.rect(-fr * 1.15, fy - fr * 0.3, fr * 2.3, r * 1.6);
      ctx.fill();
    }
    if (ch.hairStyle === 'bun') {
      circle(ctx, 0, fy - fr * 1.35, fr * 0.42); ctx.fill(); ctx.stroke();
    }
    if (ch.hairStyle === 'curly') {
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        circle(ctx, Math.cos(a) * fr * 1.05, fy - fr * 0.1 + Math.sin(a) * fr * 1.05, fr * 0.36);
        ctx.fill();
      }
    }
    circle(ctx, 0, fy - fr * 0.18, fr * 1.1); ctx.fill();

    // Omuzlar
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, r * 1.15, r * 0.75, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Yüz
    ctx.fillStyle = ch.skin;
    circle(ctx, 0, fy, fr); ctx.fill(); ctx.stroke();

    // Gözler + yaramaz kaşlar
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fff';
      circle(ctx, sx * fr * 0.38, fy - fr * 0.1, fr * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2b3a';
      circle(ctx, sx * fr * 0.38, fy - fr * 0.07, fr * 0.09); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx * fr * 0.62, fy - fr * 0.5);
      ctx.lineTo(sx * fr * 0.2, fy - fr * 0.36);
      ctx.stroke();
    }

    // Sırıtış
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, fy + fr * 0.25, fr * 0.45, Math.PI * 0.1, Math.PI * 0.9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
})();
