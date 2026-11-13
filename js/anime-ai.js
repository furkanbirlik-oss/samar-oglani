/* ============================================================
   ANIME (YAPAY ZEKÂ)
   Fotoğrafı anime çizimine çeviren AnimeGANv2 modelini
   tarayıcının içinde çalıştırır. Fotoğraf hiçbir yere gönderilmez;
   model dosyası siteden bir kez indirilir ve hesap bu cihazda yapılır.

   Dosyalar yalnızca bu stil seçildiğinde yüklenir (yaklaşık 23 MB),
   böylece oyunun açılışı yavaşlamaz.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const ORT_DIR = 'lib/ort/';
  const MODEL_URL = 'models/face_paint_512_v2_0.onnx';
  const SIZE = 512; // modelin çalıştığı çözünürlük

  let sessionPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Yüklenemedi: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function createSession() {
    return loadScript(ORT_DIR + 'ort.wasm.min.js').then(function () {
      const ort = window.ort;
      ort.env.wasm.wasmPaths = new URL(ORT_DIR, document.baseURI).href;
      ort.env.wasm.numThreads = 1; // çok iş parçacığı özel sunucu ayarı ister; tek parçacık her yerde çalışır
      ort.env.wasm.proxy = true;   // hesabı arka planda yap ki sayfa donmasın
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
    });
  }

  Oyun.animeAI = {
    /* Dosyadan çift tıklayarak açıldıysa (file://) tarayıcı modeli yükleyemez. */
    available: function () {
      return location.protocol !== 'file:' && typeof WebAssembly === 'object';
    },

    /* Modeli (bir kez) yükler. */
    load: function () {
      if (!sessionPromise) {
        sessionPromise = createSession().catch(function (e) { sessionPromise = null; throw e; });
      }
      return sessionPromise;
    },

    /* src: kare canvas. Anime'ye çevrilmiş yeni bir canvas döndürür (Promise). */
    run: function (src) {
      return this.load().then(function (session) {
        const ort = window.ort;
        // Girdi: 512x512, renkler -1..1 arası, [1, 3, 512, 512] düzeninde
        const inp = document.createElement('canvas');
        inp.width = inp.height = SIZE;
        const g = inp.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, 0, 0, SIZE, SIZE);
        const px = g.getImageData(0, 0, SIZE, SIZE).data;
        const n = SIZE * SIZE;
        const data = new Float32Array(3 * n);
        for (let i = 0; i < n; i++) {
          data[i] = px[i * 4] / 127.5 - 1;
          data[n + i] = px[i * 4 + 1] / 127.5 - 1;
          data[2 * n + i] = px[i * 4 + 2] / 127.5 - 1;
        }
        const feeds = {};
        feeds[session.inputNames[0]] = new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]);
        return session.run(feeds).then(function (res) {
          const out = res[session.outputNames[0]];
          const o = out.data, h = out.dims[2], w = out.dims[3], m = w * h;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const cg = c.getContext('2d');
          const img = cg.createImageData(w, h);
          for (let i = 0; i < m; i++) {
            img.data[i * 4] = (o[i] + 1) * 127.5;
            img.data[i * 4 + 1] = (o[m + i] + 1) * 127.5;
            img.data[i * 4 + 2] = (o[2 * m + i] + 1) * 127.5;
            img.data[i * 4 + 3] = 255;
          }
          cg.putImageData(img, 0, 0);
          return c;
        });
      });
    },
  };
})();
