/* ============================================================
   ÇİZGİ FİLM FİLTRESİ
   Kırpılmış fotoğrafı tarayıcının içinde çizgi film / anime /
   pop art / karakalem görünümüne çevirir. Fotoğraf hiçbir yere
   gönderilmez; bütün işlem bu sayfada, bellekte yapılır.

   Yöntem: (1) benzer renkleri birbirine yedirip pürüzleri sil,
   (2) kenarları bulup mürekkep çizgisi yap, (3) renkleri birkaç
   tona indir. Yeni stil eklemek için STYLES listesine bir kayıt,
   colorize() içine bir dal ekle.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});

  const STYLES = [
    { id: 'cizgi',     name: 'Çizgi Film', passes: 2, lo: 55, hi: 150 },
    { id: 'animeyz',   name: '✨ Anime (YZ)', ai: true }, // yapay zekâ modeli: bkz. js/anime-ai.js
    { id: 'anime',     name: 'Anime Filtre', passes: 3, lo: 75, hi: 190 },
    { id: 'popart',    name: 'Pop Art',    passes: 2, lo: 60, hi: 150 },
    { id: 'karakalem', name: 'Karakalem',  passes: 1, lo: 22, hi: 105 },
    { id: 'orijinal',  name: 'Orijinal' },
  ];

  /* Seçici bulanıklaştırma: her piksel, yalnızca rengi kendine yakın
     komşularıyla ortalanır. Cilt pürüzsüzleşir, kenarlar keskin kalır. */
  function smooth(src, w, h, radius, thr) {
    const out = new Uint8ClampedArray(src.length);
    const t2 = thr * thr * 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r0 = src[i], g0 = src[i + 1], b0 = src[i + 2];
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = (yy * w + xx) * 4;
            const dr = src[j] - r0, dg = src[j + 1] - g0, db = src[j + 2] - b0;
            if (dr * dr + dg * dg + db * db < t2) { sr += src[j]; sg += src[j + 1]; sb += src[j + 2]; n++; }
          }
        }
        out[i] = sr / n; out[i + 1] = sg / n; out[i + 2] = sb / n; out[i + 3] = 255;
      }
    }
    return out;
  }

  /* Kenar gücü (0-1): parlaklıktaki ani değişimler çizgi olur. */
  function edges(d, w, h, lo, hi) {
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; p < lum.length; i += 4, p++) lum[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const e = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const gx = lum[p - w + 1] + 2 * lum[p + 1] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - 1] - lum[p + w - 1];
        const gy = lum[p + w - 1] + 2 * lum[p + w] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - w] - lum[p - w + 1];
        const m = (Math.abs(gx) + Math.abs(gy) - lo) / (hi - lo);
        e[p] = m < 0 ? 0 : m > 1 ? 1 : m;
      }
    }
    // Çizgileri biraz kalınlaştır
    const out = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        out[p] = Math.max(e[p], 0.7 * Math.max(e[p - 1], e[p + 1], e[p - w], e[p + w]));
      }
    }
    return out;
  }

  const POP = [[27, 27, 58], [230, 57, 70], [255, 190, 11], [255, 243, 214]];

  function colorize(d, edge, style) {
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const a = edge[p];

      if (style === 'karakalem') {
        const v = 242 - a * 230 - (255 - Y) * 0.3;
        r = v; g = v * 0.98; b = v * 0.93;
      } else if (style === 'popart') {
        const c = POP[Y < 70 ? 0 : Y < 125 ? 1 : Y < 185 ? 2 : 3];
        r = c[0] * (1 - a) + 20 * a; g = c[1] * (1 - a) + 16 * a; b = c[2] * (1 - a) + 40 * a;
      } else {
        // Çizgi film / anime: parlaklığı birkaç tona indir (cel shading), rengi canlandır
        const anime = style === 'anime';
        const levels = anime ? 4 : 6;
        let Yn = Math.round((Y / 255) * (levels - 1)) / (levels - 1) * 255;
        Yn = Yn * 0.75 + Y * 0.25;
        if (anime) Yn = 255 * Math.pow(Yn / 255, 0.78); // daha aydınlık, pastel
        const k = Y > 1 ? Yn / Y : 1;
        const sat = anime ? 1.25 : 1.4;
        r = Yn + (r * k - Yn) * sat; g = Yn + (g * k - Yn) * sat; b = Yn + (b * k - Yn) * sat;
        r = r * (1 - a) + 34 * a; g = g * (1 - a) + 26 * a; b = b * (1 - a) + 46 * a;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }

  Oyun.cartoon = {
    styles: STYLES,

    /* src: kırpılmış kare canvas. Yeni bir canvas döndürür (src değişmez). */
    apply: function (src, styleId) {
      const st = STYLES.find(function (s) { return s.id === styleId; });
      if (!st || st.ai || st.id === 'orijinal') return src;
      const w = Math.min(256, src.width), h = w; // filtreler 256 pikselde çalışır (hızlı ve çizgiler belirgin)
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const g = out.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, w, h);
      const img = g.getImageData(0, 0, w, h);
      let d = img.data;
      for (let i = 0; i < st.passes; i++) d = smooth(d, w, h, 3, 26);
      const e = edges(d, w, h, st.lo, st.hi);
      colorize(d, e, st.id);
      img.data.set(d);
      g.putImageData(img, 0, 0);

      if (st.id === 'anime') { // anime allığı (yanaklar)
        const c = w / 2, R = w / 2;
        g.fillStyle = 'rgba(255,105,140,.3)';
        for (const sx of [-1, 1]) {
          g.beginPath(); g.ellipse(c + sx * 0.52 * R, c + 0.24 * R, 0.17 * R, 0.09 * R, 0, 0, Math.PI * 2); g.fill();
        }
      }
      return out;
    },
  };
})();
