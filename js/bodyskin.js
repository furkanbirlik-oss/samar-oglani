/* ============================================================
   TAM BOY FOTOĞRAFTAN BEBEK ("KUKLA")
   Baştan ayağa bir fotoğrafı alır, eklem noktalarına göre kafa,
   gövde, kol ve bacak parçalarına keser ve bez bebeğin parçalarına
   giydirir. Böylece bebek fotoğraftaki kişinin kendisi olur.

   Akış:  loadPhoto() -> setDetection() -> openEditor() -> build()
   Sonuç: Oyun.skin (varsa ragdoll.js çizim yerine bunu kullanır)

   Fotoğraf yalnızca bellekte durur; hiçbir yere gönderilmez.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const INK = '#2b2b3a';
  const MAX_SIDE = 900;  // fotoğraf en fazla bu boyuta küçültülür (hız için)

  // Çizim sırası ve parçaların dinlenme konumları (ragdoll.js ile aynı sayılar)
  const ORDER = ['uArmL', 'lArmL', 'uLegL', 'lLegL', 'uLegR', 'lLegR', 'torso', 'uArmR', 'lArmR', 'head'];
  const REST = {
    head: [0, -232], torso: [0, -152],
    uArmL: [-40, -167], lArmL: [-40, -123], uArmR: [40, -167], lArmR: [40, -123],
    uLegL: [-15, -78], lLegL: [-15, -26], uLegR: [15, -78], lLegR: [15, -26],
  };

  /* Uzuvlar: [parça, başlangıç noktası, bitiş noktası, kalınlık (omuz genişliğine oran),
               baştan taşma, sondan taşma, başlangıcın parçadaki y'si, bitişin y'si] */
  const LIMBS = [];
  ['L', 'R'].forEach(function (s) {
    LIMBS.push(['uArm' + s, 'sh' + s, 'el' + s, 0.36, 0.12, 0.08, -19, 22]);
    LIMBS.push(['lArm' + s, 'el' + s, 'wr' + s, 0.30, 0.08, 0.45, -22, 21]); // sonda el
    LIMBS.push(['uLeg' + s, 'hip' + s, 'kn' + s, 0.50, 0.10, 0.06, -24, 26]);
    LIMBS.push(['lLeg' + s, 'kn' + s, 'an' + s, 0.40, 0.06, 0.30, -26, 20]); // sonda ayak
  });

  // Düzenleme ekranındaki noktalar: [ad, renk]
  const POINTS = [['top', '#ffd23f'], ['chin', '#ffd23f'], ['eyeL', '#ffffff'], ['eyeR', '#ffffff']];
  ['sh', 'el', 'wr', 'hip', 'kn', 'an'].forEach(function (n) {
    POINTS.push([n + 'L', '#ff5d8f']);
    POINTS.push([n + 'R', '#4cc9f0']);
  });
  const BONES = [['shL', 'shR'], ['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['shL', 'hipL'], ['shR', 'hipR'],
    ['hipL', 'hipR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR']];

  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  /* Fotoğraftan, A-B doğrultusu dikey olacak şekilde bir şerit keser. */
  function cutRegion(img, A, B, width, extA, extB, shape) {
    const L = dist(A, B) || 1;
    const w = Math.max(4, Math.round(width)), h = Math.max(4, Math.round(L * (1 + extA + extB)));
    const c = mk(w, h), g = c.getContext('2d');
    if (shape === 'ellipse') { g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); }
    else Oyun.roundRect(g, 0, 0, w, h, shape === 'torso' ? w * 0.22 : w / 2);
    g.clip();
    g.translate(w / 2, extA * L);
    g.rotate(Math.PI / 2 - Math.atan2(B.y - A.y, B.x - A.x));
    g.translate(-A.x, -A.y);
    g.drawImage(img, 0, 0);
    return { c: c, ax: w / 2, ay: extA * L, L: L };
  }

  /* Kesilen parçanın etrafına çıkartma gibi koyu bir kenar çizgisi ekler.
     Vuruş parlaması için beyaz bir gölge kopyası da üretir. */
  function sticker(region, t) {
    const pad = Math.ceil(t) + 1;
    const W = region.width + pad * 2, H = region.height + pad * 2;
    const sil = mk(W, H), sg = sil.getContext('2d');
    sg.drawImage(region, pad, pad);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = INK; sg.fillRect(0, 0, W, H);
    const tex = mk(W, H), g = tex.getContext('2d');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.drawImage(sil, Math.cos(a) * t, Math.sin(a) * t);
    }
    g.drawImage(region, pad, pad);
    const white = mk(W, H), wg = white.getContext('2d');
    wg.drawImage(tex, 0, 0);
    wg.globalCompositeOperation = 'source-in';
    wg.fillStyle = '#fff'; wg.fillRect(0, 0, W, H);
    return { tex: tex, white: white, pad: pad };
  }

  /* Kesilmiş şeridi bebeğin bir parçasına oturtur (ölçüler S = 1 içindir). */
  function entry(cut, k, yA) {
    const st = sticker(cut.c, 2.6 / k);
    return {
      tex: st.tex, white: st.white,
      x: -(cut.ax + st.pad) * k, y: yA - (cut.ay + st.pad) * k,
      w: st.tex.width * k, h: st.tex.height * k,
    };
  }

  const B = (Oyun.body = {
    src: null,        // fotoğraf (küçültülmüş canvas)
    mask: null,       // kişi maskesi { data, w, h } ya da null
    rig: null,        // eklem noktaları: ad -> {x, y} (fotoğraf pikseli)
    auto: false,      // noktalar otomatik bulundu mu
    widthScale: 1,    // uzuv kalınlığı çarpanı
    cache: {},        // stil -> filtrelenmiş fotoğraf

    clear: function () {
      this.src = null; this.mask = null; this.rig = null; this.cache = {};
      Oyun.skin = null;
    },

    /* Dosyayı bellekte açar ve küçültür. */
    loadPhoto: function (file) {
      const self = this;
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) return reject(new Error('Resim dosyası değil'));
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = function () {
          URL.revokeObjectURL(url);
          const k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
          const c = mk(im.naturalWidth * k, im.naturalHeight * k);
          const g = c.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(im, 0, 0, c.width, c.height);
          self.src = c; self.mask = null; self.rig = null; self.cache = {}; self.widthScale = 1;
          resolve(c);
        };
        im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Dosya açılamadı')); };
        im.src = url;
      });
    },

    /* Poz modelinin sonucunu eklem noktalarına çevirir; sonuç yoksa hazır bir iskelet koyar. */
    setDetection: function (det) {
      const p = det && det.points;
      this.mask = (det && det.mask) || null;
      this.auto = !!p;
      if (!p) { this.rig = this.defaultRig(); return; }
      // Model "kişinin solu / sağı" der; bize resimde solda / sağda duran lazım
      const flip = p[11].x > p[12].x;
      const Lset = flip ? [12, 14, 16, 24, 26, 28] : [11, 13, 15, 23, 25, 27];
      const Rset = flip ? [11, 13, 15, 23, 25, 27] : [12, 14, 16, 24, 26, 28];
      const names = ['sh', 'el', 'wr', 'hip', 'kn', 'an'];
      const rig = {};
      names.forEach(function (n, i) {
        rig[n + 'L'] = { x: p[Lset[i]].x, y: p[Lset[i]].y };
        rig[n + 'R'] = { x: p[Rset[i]].x, y: p[Rset[i]].y };
      });
      const e1 = p[2], e2 = p[5];
      rig.eyeL = e1.x < e2.x ? { x: e1.x, y: e1.y } : { x: e2.x, y: e2.y };
      rig.eyeR = e1.x < e2.x ? { x: e2.x, y: e2.y } : { x: e1.x, y: e1.y };
      // Kafa üstü ve çene: göz hizasından yukarı / aşağı
      const E = mid(rig.eyeL, rig.eyeR), S = mid(rig.shL, rig.shR);
      const sw = dist(rig.shL, rig.shR);
      const d = Math.max(dist(rig.eyeL, rig.eyeR), sw * 0.14);
      let ux = -(rig.eyeR.y - rig.eyeL.y), uy = rig.eyeR.x - rig.eyeL.x;
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      if (ux * (E.x - S.x) + uy * (E.y - S.y) < 0) { ux = -ux; uy = -uy; } // omuzlardan uzağa baksın
      rig.top = { x: E.x + ux * d * 2.0, y: E.y + uy * d * 2.0 };
      rig.chin = { x: E.x - ux * d * 1.9, y: E.y - uy * d * 1.9 };
      this.rig = rig;
    },

    /* Otomatik bulunamazsa: fotoğrafın ortasına hazır bir iskelet */
    defaultRig: function () {
      const w = this.src.width, h = this.src.height, cx = w / 2;
      const P = function (dx, y) { return { x: cx + dx * h, y: y * h }; };
      return {
        top: P(0, 0.05), chin: P(0, 0.17), eyeL: P(-0.022, 0.105), eyeR: P(0.022, 0.105),
        shL: P(-0.1, 0.22), shR: P(0.1, 0.22), elL: P(-0.13, 0.38), elR: P(0.13, 0.38),
        wrL: P(-0.15, 0.52), wrR: P(0.15, 0.52), hipL: P(-0.06, 0.52), hipR: P(0.06, 0.52),
        knL: P(-0.065, 0.72), knR: P(0.065, 0.72), anL: P(-0.07, 0.92), anR: P(0.07, 0.92),
      };
    },

    limbWidth: function (factor) {
      return dist(this.rig.shL, this.rig.shR) * factor * this.widthScale;
    },
    torsoWidth: function () {
      const r = this.rig;
      return Math.max(dist(r.shL, r.shR), dist(r.hipL, r.hipR) * 1.25) * 1.35 * this.widthScale;
    },

    /* ---------- Stil: fotoğrafın tamamına filtre / yapay zekâ ---------- */
    styled: function (styleId) {
      const self = this;
      if (this.cache[styleId]) return Promise.resolve(this.cache[styleId]);
      const st = Oyun.cartoon.styles.find(function (s) { return s.id === styleId; });
      let p;
      if (st && st.ai) p = this.animeBody();
      else p = Promise.resolve(Oyun.cartoon.apply(this.src, styleId, { full: true }));
      const src = this.src;
      return p.then(function (c) { if (self.src === src) self.cache[styleId] = c; return c; });
    },

    /* Anime (YZ): model 512x512 çalıştığı için iki geçiş yapılır;
       önce bütün vücut, sonra yüz ayrıntılı çıksın diye kafa. */
    animeBody: function () {
      const src = this.src, r = this.rig;
      const out = mk(src.width, src.height), og = out.getContext('2d');
      og.drawImage(src, 0, 0);
      const square = function (cx, cy, side) { // fotoğraftan kare bir bölge (dışı gri)
        const c = mk(side, side), g = c.getContext('2d');
        g.fillStyle = '#888'; g.fillRect(0, 0, side, side);
        g.drawImage(src, -(cx - side / 2), -(cy - side / 2));
        return c;
      };
      // 1) Bütün vücut
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      Object.keys(r).forEach(function (k) {
        x0 = Math.min(x0, r[k].x); y0 = Math.min(y0, r[k].y); x1 = Math.max(x1, r[k].x); y1 = Math.max(y1, r[k].y);
      });
      const side = Math.max(x1 - x0, y1 - y0) * 1.25, bx = (x0 + x1) / 2, by = (y0 + y1) / 2;
      // 2) Kafa
      const C = mid(r.top, r.chin), hs = dist(r.top, r.chin) * 1.9;
      return Oyun.animeAI.run(square(bx, by, side)).then(function (a) {
        og.drawImage(a, bx - side / 2, by - side / 2, side, side);
        return Oyun.animeAI.run(square(C.x, C.y, hs));
      }).then(function (a) {
        const t = mk(hs, hs), tg = t.getContext('2d');
        tg.drawImage(a, 0, 0, hs, hs);
        const grad = tg.createRadialGradient(hs / 2, hs / 2, hs * 0.32, hs / 2, hs / 2, hs * 0.5);
        grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        tg.globalCompositeOperation = 'destination-in'; // kenarları yumuşat
        tg.fillStyle = grad; tg.fillRect(0, 0, hs, hs);
        og.drawImage(t, C.x - hs / 2, C.y - hs / 2);
        return out;
      });
    },

    /* Arka planı siler (maske varsa). */
    applyMask: function (img) {
      const c = mk(img.width, img.height), g = c.getContext('2d');
      g.drawImage(img, 0, 0, c.width, c.height);
      const m = this.mask;
      if (!m) return c;
      const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
      for (let y = 0; y < c.height; y++) {
        const my = Math.min(m.h - 1, (y * m.h / c.height) | 0);
        for (let x = 0; x < c.width; x++) {
          const v = m.data[my * m.w + Math.min(m.w - 1, (x * m.w / c.width) | 0)];
          d[(y * c.width + x) * 4 + 3] = v < 0.3 ? 0 : v > 0.6 ? 255 : ((v - 0.3) / 0.3) * 255;
        }
      }
      g.putImageData(id, 0, 0);
      return c;
    },

    /* Fotoğrafı parçalara kesip bebeğe giydirilecek "deri"yi üretir (Promise). */
    build: function (styleId) {
      const self = this, src = this.src;
      return this.styled(styleId).then(function (styledImg) {
        if (self.src !== src) return null; // bu sırada fotoğraf değişti
        const img = self.applyMask(styledImg), r = self.rig;
        const parts = {};

        LIMBS.forEach(function (L) {
          const A = r[L[1]], Bp = r[L[2]];
          const cut = cutRegion(img, A, Bp, self.limbWidth(L[3]), L[4], L[5]);
          parts[L[0]] = entry(cut, (L[7] - L[6]) / cut.L, L[6]);
        });

        const tc = cutRegion(img, mid(r.shL, r.shR), mid(r.hipL, r.hipR), self.torsoWidth(), 0.2, 0.14, 'torso');
        parts.torso = entry(tc, 84 / tc.L, -34);

        // Kafa: saçı da alsın diye üstten ve yandan biraz taşar; daire değil, kişinin kendi şekli
        const hc = cutRegion(img, r.top, r.chin, dist(r.top, r.chin) * 1.2, 0.18, 0.12, 'ellipse');
        const hk = 96 / hc.L, HEAD_Y = -6; // kafa biraz iri: yüz seçilsin
        parts.head = entry(hc, hk, HEAD_Y - hc.L * hk / 2);

        // Gözlerin kafa parçasındaki yeri (süsler tam göze otursun)
        const C = mid(r.top, r.chin);
        const rot = Math.PI / 2 - Math.atan2(r.chin.y - r.top.y, r.chin.x - r.top.x);
        const toHead = function (p) {
          const dx = p.x - C.x, dy = p.y - C.y;
          return { x: (dx * Math.cos(rot) - dy * Math.sin(rot)) * hk, y: (dx * Math.sin(rot) + dy * Math.cos(rot)) * hk + HEAD_Y };
        };
        return { parts: parts, eyes: [toHead(r.eyeL), toHead(r.eyeR)] };
      });
    },
  });

  /* ---------- Çizim ---------- */

  /* Bebeğin bir parçasını (parçanın kendi koordinatlarında) çizer. */
  Oyun.drawSkinPart = function (ctx, name, S, flash, faceState) {
    const sk = Oyun.skin, p = sk && sk.parts[name];
    if (!p) return false;
    ctx.drawImage(p.tex, p.x * S, p.y * S, p.w * S, p.h * S);
    if (flash) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(p.white, p.x * S, p.y * S, p.w * S, p.h * S);
      ctx.globalAlpha = 1;
    }
    if (name === 'head' && faceState) {
      // Hasar süslerini gerçek göz konumlarına göre yerleştir
      const a = sk.eyes[0], b = sk.eyes[1];
      const d = Math.max(4, Math.hypot(b.x - a.x, b.y - a.y)) * S;
      const r = d / 0.72; // face.js gözleri ±0.36r'de varsayar
      ctx.save();
      ctx.translate((a.x + b.x) / 2 * S, (a.y + b.y) / 2 * S);
      ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.translate(0, 0.15 * r);
      if (faceState.level >= 4) Oyun.face.drawBump(ctx, r, faceState.t);
      Oyun.face.drawOverlays(ctx, r, faceState);
      ctx.restore();
    }
    return true;
  };

  /* Menü önizlemesi: bebeği ayakta, hareketsiz çizer. */
  Oyun.drawSkinStatic = function (ctx, x, gy, S) {
    if (!Oyun.skin) return;
    ORDER.forEach(function (name) {
      ctx.save();
      ctx.translate(x + REST[name][0] * S, gy + REST[name][1] * S);
      Oyun.drawSkinPart(ctx, name, S, false, null);
      ctx.restore();
    });
  };

  /* ---------- Eklem düzenleme ekranı ---------- */
  let root, canvas, g, slider, hint, onOk, onCancel, scale = 1, drag = null;

  function drawEditor() {
    const r = B.rig, f = scale;
    g.setTransform(canvas.width / (B.src.width * f), 0, 0, canvas.height / (B.src.height * f), 0, 0);
    g.clearRect(0, 0, B.src.width * f, B.src.height * f);
    g.drawImage(B.src, 0, 0, B.src.width * f, B.src.height * f);
    g.fillStyle = 'rgba(20,20,35,.35)';
    g.fillRect(0, 0, B.src.width * f, B.src.height * f);
    g.lineCap = 'round'; g.lineJoin = 'round';

    // Kesilecek alanlar (yarı saydam)
    g.strokeStyle = 'rgba(255,255,255,.3)';
    LIMBS.forEach(function (L) {
      g.lineWidth = B.limbWidth(L[3]) * f;
      g.beginPath(); g.moveTo(r[L[1]].x * f, r[L[1]].y * f); g.lineTo(r[L[2]].x * f, r[L[2]].y * f); g.stroke();
    });
    const sm = mid(r.shL, r.shR), hm = mid(r.hipL, r.hipR);
    g.lineCap = 'butt';
    g.lineWidth = B.torsoWidth() * f;
    g.beginPath(); g.moveTo(sm.x * f, sm.y * f); g.lineTo(hm.x * f, hm.y * f); g.stroke();
    g.lineCap = 'round';
    const C = mid(r.top, r.chin), hl = dist(r.top, r.chin);
    g.save();
    g.translate(C.x * f, (C.y - hl * 0.03) * f);
    g.rotate(Math.atan2(r.chin.y - r.top.y, r.chin.x - r.top.x) - Math.PI / 2);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 0, hl * 0.6 * f, hl * 0.65 * f, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();

    // İskelet çizgileri ve noktalar
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    BONES.forEach(function (b) {
      g.beginPath(); g.moveTo(r[b[0]].x * f, r[b[0]].y * f); g.lineTo(r[b[1]].x * f, r[b[1]].y * f); g.stroke();
    });
    POINTS.forEach(function (p) {
      const pt = r[p[0]], small = p[0].indexOf('eye') === 0;
      g.fillStyle = p[1]; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.arc(pt.x * f, pt.y * f, small ? 5 : 9, 0, Math.PI * 2); g.fill(); g.stroke();
    });
  }

  function fit() {
    const maxW = Math.min(window.innerWidth - 40, 560), maxH = Math.max(220, window.innerHeight - 250);
    scale = Math.min(maxW / B.src.width, maxH / B.src.height);
    const cw = Math.round(B.src.width * scale), ch = Math.round(B.src.height * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = cw * dpr; canvas.height = ch * dpr;
  }

  function setupEditor() {
    root = document.getElementById('rig');
    canvas = document.getElementById('rigCanvas');
    g = canvas.getContext('2d');
    slider = document.getElementById('rigWidth');
    hint = document.getElementById('rigHint');

    const pos = function (e) {
      const b = canvas.getBoundingClientRect();
      return { x: (e.clientX - b.left) / scale, y: (e.clientY - b.top) / scale };
    };
    canvas.addEventListener('pointerdown', function (e) {
      const p = pos(e);
      let best = 34 / scale; // parmakla da tutulabilsin
      drag = null;
      POINTS.forEach(function (pt) {
        const d = dist(p, B.rig[pt[0]]);
        if (d < best) { best = d; drag = pt[0]; }
      });
      if (drag) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* önemli değil */ } }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const p = pos(e);
      B.rig[drag] = { x: Math.max(0, Math.min(B.src.width, p.x)), y: Math.max(0, Math.min(B.src.height, p.y)) };
      drawEditor();
    });
    const up = function () { drag = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    slider.addEventListener('input', function () { B.widthScale = parseFloat(slider.value); drawEditor(); });
    document.getElementById('rigOk').addEventListener('click', function () {
      root.classList.remove('open');
      B.cache = {}; // noktalar değişti: anime geçişi yeniden hesaplansın
      if (onOk) onOk();
    });
    document.getElementById('rigCancel').addEventListener('click', function () {
      root.classList.remove('open');
      if (onCancel) onCancel();
    });
    window.addEventListener('resize', function () {
      if (root.classList.contains('open') && B.src) { fit(); drawEditor(); }
    });
  }

  B.openEditor = function (ok, cancel) {
    if (!root) setupEditor();
    onOk = ok; onCancel = cancel;
    slider.value = this.widthScale;
    hint.textContent = this.auto
      ? 'Eklemler otomatik bulundu. Yanlış duran noktayı sürükleyerek düzelt.'
      : 'Vücut otomatik bulunamadı. Noktaları sürükleyerek kişinin eklemlerine yerleştir.';
    root.classList.add('open');
    fit();
    drawEditor();
  };
})();
