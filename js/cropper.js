/* ============================================================
   FOTOĞRAF KIRPMA
   Seçilen dosya sadece tarayıcı belleğinde açılır. Sürükleyip
   yakınlaştırarak yüz daireye oturtulur; sonuç 256x256'lık bir
   canvas olarak geri verilir. Hiçbir şey yüklenmez / kaydedilmez.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const SIZE = 300;   // kırpma alanı (CSS pikseli)
  const D = 260;      // dairenin çapı
  const OUT = 256;    // çıktı boyutu

  let root, canvas, ctx, slider;
  let img = null, minScale = 1, zoom = 1, off = { x: 0, y: 0 }, onDone = null;
  const pointers = new Map();
  let pinchDist = 0;

  function scale() { return minScale * zoom; }

  function clampOffset() {
    const s = scale();
    const mx = Math.max(0, (img.naturalWidth * s - D) / 2);
    const my = Math.max(0, (img.naturalHeight * s - D) / 2);
    off.x = Math.max(-mx, Math.min(mx, off.x));
    off.y = Math.max(-my, Math.min(my, off.y));
  }

  function setZoom(z) {
    z = Math.max(1, Math.min(5, z));
    off.x *= z / zoom; off.y *= z / zoom; // merkeze göre yakınlaş
    zoom = z;
    slider.value = z;
    clampOffset();
    draw();
  }

  function draw() {
    const c = SIZE / 2, R = D / 2;
    ctx.setTransform(canvas.width / SIZE, 0, 0, canvas.height / SIZE, 0, 0);
    ctx.fillStyle = '#1c1c28';
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (!img) return;
    const s = scale(), w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, c + off.x - w / 2, c + off.y - h / 2, w, h);

    // Daire dışını karart
    ctx.fillStyle = 'rgba(10,10,20,.65)';
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.arc(c, c, R, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();

    // Göz hizası kılavuzu
    const ey = c - 0.15 * R, ex = 0.36 * R;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(c - R * 0.8, ey); ctx.lineTo(c + R * 0.8, ey); ctx.stroke();
    ctx.setLineDash([]);
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.arc(c + sx * ex, ey, R * 0.2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function close() {
    root.classList.remove('open');
    img = null;          // fotoğrafın aslını bellekten bırak
    onDone = null;
    pointers.clear();
    draw();
  }

  function finish() {
    if (!img) return close();
    const out = document.createElement('canvas');
    out.width = out.height = OUT;
    const k = OUT / D, s = scale() * k;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    const o = out.getContext('2d');
    o.imageSmoothingQuality = 'high';
    o.drawImage(img, OUT / 2 + off.x * k - w / 2, OUT / 2 + off.y * k - h / 2, w, h);
    const cb = onDone;
    close();
    if (cb) cb(out);
  }

  function setup() {
    root = document.getElementById('cropper');
    canvas = document.getElementById('cropCanvas');
    ctx = canvas.getContext('2d');
    slider = document.getElementById('cropZoom');

    // Ekrandaki piksel -> kırpma alanı pikseli
    const ratio = function () { return SIZE / (canvas.clientWidth || SIZE); };

    canvas.addEventListener('pointerdown', function (e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* önemli değil */ }
      pinchDist = 0;
    });
    canvas.addEventListener('pointermove', function (e) {
      const p = pointers.get(e.pointerId);
      if (!p || !img) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 1) {
        off.x += dx * ratio(); off.y += dy * ratio();
        clampOffset();
        draw();
      } else if (pointers.size === 2) { // iki parmakla yakınlaştırma
        const a = Array.from(pointers.values());
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        if (pinchDist) setZoom(zoom * d / pinchDist);
        pinchDist = d;
      }
    });
    const up = function (e) { pointers.delete(e.pointerId); pinchDist = 0; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (img) setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    }, { passive: false });
    slider.addEventListener('input', function () { if (img) setZoom(parseFloat(slider.value)); });

    document.getElementById('cropOk').addEventListener('click', finish);
    document.getElementById('cropCancel').addEventListener('click', close);
  }

  Oyun.cropper = {
    /* file: <input type="file"> ile seçilen dosya; done(canvas) kırpma bitince çağrılır. */
    open: function (file, done) {
      if (!root) setup();
      if (!file || !/^image\//.test(file.type)) {
        alert('Lütfen bir resim dosyası seç (JPG, PNG vb.).');
        return;
      }
      const url = URL.createObjectURL(file); // sadece bu sekmede geçerli geçici adres
      const im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        img = im;
        onDone = done;
        minScale = Math.max(D / im.naturalWidth, D / im.naturalHeight);
        zoom = 1; off = { x: 0, y: 0 };
        slider.value = 1;
        root.classList.add('open');
        draw();
      };
      im.onerror = function () {
        URL.revokeObjectURL(url);
        alert('Bu dosya açılamadı. Başka bir fotoğraf dener misin?');
      };
      im.src = url;
    },
  };
})();
