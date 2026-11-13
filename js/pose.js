/* ============================================================
   POZ BULMA
   Tam boy fotoğrafta omuz, dirsek, diz gibi eklemleri bulur ve
   kişiyi arka plandan ayıran bir maske üretir. Google'ın MediaPipe
   Pose Landmarker modeli tarayıcının içinde çalışır; fotoğraf
   hiçbir yere gönderilmez. Dosyalar (yaklaşık 24 MB) yalnızca
   tam boy fotoğraf yüklendiğinde indirilir.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const LIB = 'lib/mediapipe/';
  const MODEL = 'models/pose_landmarker_full.task';
  let landmarkerPromise = null;

  function abs(path) { return new URL(path, document.baseURI).href; }

  function create() {
    return import(abs(LIB + 'vision_bundle.mjs')).then(function (vision) {
      return vision.FilesetResolver.forVisionTasks(abs(LIB + 'wasm')).then(function (fileset) {
        return vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: abs(MODEL), delegate: 'CPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
          outputSegmentationMasks: true,
        });
      });
    });
  }

  Oyun.pose = {
    /* Dosyadan çift tıklayarak açıldıysa (file://) tarayıcı modeli yükleyemez. */
    available: function () { return location.protocol !== 'file:' && typeof WebAssembly === 'object'; },

    load: function () {
      if (!landmarkerPromise) {
        landmarkerPromise = create().catch(function (e) { landmarkerPromise = null; throw e; });
      }
      return landmarkerPromise;
    },

    /* canvas: fotoğraf. Döner (Promise):
       { points: [33 x {x, y, v}] piksel cinsinden ya da null,
         mask: { data: Float32Array (0-1), w, h } ya da null } */
    detect: function (canvas) {
      return this.load().then(function (lm) {
        const res = lm.detect(canvas);
        const out = { points: null, mask: null };
        try {
          if (res.landmarks && res.landmarks[0]) {
            out.points = res.landmarks[0].map(function (p) {
              return { x: p.x * canvas.width, y: p.y * canvas.height, v: p.visibility === undefined ? 1 : p.visibility };
            });
          }
          const m = res.segmentationMasks && res.segmentationMasks[0];
          if (m && out.points) {
            out.mask = { data: new Float32Array(m.getAsFloat32Array()), w: m.width, h: m.height };
          }
        } finally {
          if (res.close) res.close(); // modelin ayırdığı belleği bırak
        }
        return out;
      });
    },
  };
})();
