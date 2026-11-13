/* ============================================================
   SESLER
   Bütün sesler Web Audio API ile o anda üretilir; ses dosyası yok.
   Yeni ses eklemek için SOUNDS içine bir fonksiyon ekle ve
   saldırı tanımında sound: 'adı' olarak kullan.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  let ctx = null, master = null, noiseBuf = null;

  /* Filtrelenmiş gürültü patlaması (şaklama, hışırtı vb.) */
  function noise(t, o) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }

  /* Perdesi kayan ton (güm, boing, çın vb.) */
  function tone(t, o) {
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    if (o.vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibrato;
      lg.gain.value = o.vibratoDepth || 40;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + o.dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  const SOUNDS = {
    whoosh: function (t) {
      noise(t, { f0: 400, f1: 2200, q: 1.5, dur: 0.16, gain: 0.18, attack: 0.05 });
    },
    slap: function (t) {
      noise(t, { f0: 2600, q: 0.8, dur: 0.1, gain: 0.9 });
      noise(t, { type: 'highpass', f0: 4500, dur: 0.04, gain: 0.5 });
    },
    slipper: function (t) {
      noise(t, { f0: 1500, q: 0.9, dur: 0.11, gain: 0.9 });
      tone(t, { f0: 320, f1: 110, dur: 0.09, gain: 0.5 });
    },
    punch: function (t) {
      tone(t, { f0: 170, f1: 48, dur: 0.16, gain: 1.0 });
      noise(t, { type: 'lowpass', f0: 900, dur: 0.07, gain: 0.6 });
    },
    kick: function (t) {
      tone(t, { f0: 125, f1: 36, dur: 0.24, gain: 1.0 });
      noise(t, { type: 'lowpass', f0: 500, dur: 0.1, gain: 0.7 });
    },
    bag: function (t) {
      noise(t, { type: 'lowpass', f0: 700, dur: 0.15, gain: 0.9 });
      tone(t, { f0: 110, f1: 60, dur: 0.12, gain: 0.5 });
      [2200, 2950, 3600].forEach(function (f, i) {   // çantanın içindekiler şıngırdar
        tone(t + 0.03 + i * 0.035, { f0: f, dur: 0.06, gain: 0.07 });
      });
    },
    pan: function (t) {
      noise(t, { type: 'highpass', f0: 3000, dur: 0.03, gain: 0.5 });
      [[420, 0.5, 1.1], [1130, 0.3, 0.8], [1870, 0.18, 0.6], [2750, 0.1, 0.4]].forEach(function (p) {
        tone(t, { f0: p[0], f1: p[0] * 0.985, dur: p[2], gain: p[1] });
      });
    },
    headbutt: function (t) {
      tone(t, { type: 'triangle', f0: 240, f1: 150, dur: 0.07, gain: 0.9 });
      tone(t, { f0: 95, f1: 55, dur: 0.14, gain: 0.8 });
      SOUNDS.boing(t + 0.06);
    },
    flykick: function (t) {
      tone(t, { f0: 150, f1: 30, dur: 0.32, gain: 1.0 });
      noise(t, { type: 'lowpass', f0: 1200, f1: 200, dur: 0.2, gain: 0.9 });
    },
    boing: function (t) {
      tone(t, { f0: 330, f1: 140, dur: 0.45, gain: 0.22, vibrato: 24, vibratoDepth: 70 });
    },
    squeak: function (t) {
      tone(t, { f0: 900, f1: 1500, dur: 0.07, gain: 0.12 });
      tone(t + 0.07, { f0: 1500, f1: 650, dur: 0.12, gain: 0.12 });
    },
    thud: function (t, k) {
      tone(t, { f0: 95, f1: 42, dur: 0.13, gain: 0.6 * k });
      noise(t, { type: 'lowpass', f0: 400, dur: 0.07, gain: 0.4 * k });
    },
    combo: function (t, n) {
      const f = 520 * Math.pow(2, Math.min(n, 14) / 12);
      tone(t, { type: 'square', f0: f, dur: 0.07, gain: 0.08 });
      tone(t + 0.07, { type: 'square', f0: f * 1.5, dur: 0.09, gain: 0.08 });
    },
    click: function (t) {
      tone(t, { f0: 600, f1: 950, dur: 0.06, gain: 0.15 });
    },
    levelup: function (t) {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(t + i * 0.07, { type: 'triangle', f0: f, dur: 0.12, gain: 0.15 });
      });
    },
  };

  /* ---------- iPhone / iPad için ses açma ----------
     iPhone'da sessiz mod anahtarı açıkken Web Audio sesleri duyulmaz.
     Bilinen çözüm: arka planda SESSİZ bir <audio> öğesini döngüde çalmak.
     Böylece telefon sayfayı "medya oynatıyor" sayar ve oyun sesleri duyulur.
     Çalınan şey bellekte üretilen yarım saniyelik sessizliktir; dosya yok. */
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let silentEl = null;

  function startSilentLoop() {
    try {
      if (!silentEl) {
        const rate = 8000, n = rate / 2;
        const buf = new ArrayBuffer(44 + n), v = new DataView(buf);
        const str = function (o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE');
        str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
        str(36, 'data'); v.setUint32(40, n, true);
        for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); // 8 bit seste 128 = sessizlik
        silentEl = new Audio();
        silentEl.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
        silentEl.loop = true;
        silentEl.preload = 'auto';
        silentEl.setAttribute('playsinline', '');
        // Sayfa arka plana geçince durdur, öne gelince bir sonraki dokunuşta yeniden başlar
        document.addEventListener('visibilitychange', function () {
          if (document.hidden && silentEl) silentEl.pause();
        });
      }
      if (silentEl.paused) {
        const p = silentEl.play();
        if (p && p.catch) p.catch(function () { /* dokunuş dışında çağrıldıysa sorun değil */ });
      }
    } catch (e) { /* ses açılamazsa oyun yine de çalışsın */ }
  }

  Oyun.audio = {
    muted: false,

    /* Tarayıcılar sesi ancak bir tıklamadan sonra açar; ilk tıklamada çağrılır. */
    init: function () {
      try {
        if (IS_IOS) startSilentLoop();
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          // iPhone: ses sistemi kurulmadan ÖNCE "oynatma sesi" olarak işaretle
          if (navigator.audioSession) {
            try { navigator.audioSession.type = 'playback'; } catch (e) { /* desteklenmiyorsa geç */ }
          }
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.6;
          master.connect(ctx.destination);
          noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          // iPhone: ilk dokunuşta sessiz bir ses çalmak ses sistemini açar
          const unlock = ctx.createBufferSource();
          unlock.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
          unlock.connect(ctx.destination);
          unlock.start(0);
        }
        // 'suspended' ya da iPhone'da 'interrupted' (arama, sekme değişimi sonrası) olabilir
        if (ctx.state !== 'running') ctx.resume();
      } catch (e) {
        console.warn('Ses başlatılamadı:', e);
      }
    },

    play: function (name, arg) {
      if (this.muted || !ctx || !SOUNDS[name]) return;
      try { SOUNDS[name](ctx.currentTime + 0.001, arg === undefined ? 1 : arg); } catch (e) { /* ses hatası oyunu durdurmasın */ }
    },

    toggleMute: function () {
      this.muted = !this.muted;
      return this.muted;
    },
  };
})();
