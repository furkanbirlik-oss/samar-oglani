/* ============================================================
   PUAN, KOMBO VE ÖFKE
   - Art arda hızlı vuruşlar kombo yapar; kombo puanı çarpar.
   - Puan eşikleri aşıldıkça hasar seviyesi artar ve yüze
     yeni süsler eklenir (bkz. js/face.js).
   - Her puan öfke barını doldurur; bar dolunca "ÇILDIR!" açılır.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const COMBO_WINDOW = 1500; // iki vuruş arasında en fazla bu kadar ms olursa kombo sürer
  const RAGE_PER_POINT = 0.06; // öfke barı: 100'e ulaşınca dolar

  Oyun.score = {
    points: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,
    lastHit: 0,
    level: 0,
    rage: 0,           // 0-100
    rageLocked: false, // çıldırma sürerken bar dolmasın
    thresholds: [120, 350, 700, 1200, 2000],
    levelNames: ['Sapasağlam', 'Yara Bandılı', 'Gözü Morarmış', 'Şaşı Olmuş', 'Kafası Şişmiş', 'Tamamen Fıttırmış'],
    el: null,

    reset: function () {
      this.points = 0; this.combo = 0; this.bestCombo = 0; this.hits = 0;
      this.lastHit = 0; this.level = 0; this.rage = 0; this.rageLocked = false;
      this.render();
    },

    /* Saldırı isabeti. Geri döner: { gained, combo, levelUp } */
    hit: function (base, now) {
      this.combo = now - this.lastHit <= COMBO_WINDOW ? this.combo + 1 : 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.lastHit = now;
      this.hits++;
      const mult = Math.min(3, 1 + (this.combo - 1) * 0.15);
      const gained = Math.round(base * (0.9 + Math.random() * 0.2) * mult);
      return this.add(gained);
    },

    /* Kombo saymayan puan (duvara çarpma, yağmur taneleri gibi) */
    add: function (gained) {
      this.points += gained;
      if (!this.rageLocked) this.rage = Math.min(100, this.rage + gained * RAGE_PER_POINT);
      let levelUp = false;
      while (this.level < this.thresholds.length && this.points >= this.thresholds[this.level]) {
        this.level++;
        levelUp = true;
      }
      this.render(true);
      return { gained: gained, combo: this.combo, levelUp: levelUp };
    },

    /* Her karede: kombo süresini ve çubukları günceller. */
    update: function (now) {
      if (!this.el) return;
      const left = COMBO_WINDOW - (now - this.lastHit);
      if (this.combo > 0 && left <= 0) this.combo = 0;
      const show = this.combo >= 2;
      this.el.comboBox.classList.toggle('on', show);
      if (show) {
        this.el.comboVal.textContent = 'x' + this.combo;
        this.el.comboBar.style.width = Math.max(0, (left / COMBO_WINDOW) * 100) + '%';
      }
      this.el.rageBar.style.width = this.rage + '%';
      this.el.rageWrap.classList.toggle('full', this.rage >= 100);
    },

    render: function (bump) {
      if (!this.el) {
        this.el = {
          score: document.getElementById('scoreVal'),
          comboBox: document.getElementById('comboBox'),
          comboVal: document.getElementById('comboVal'),
          comboBar: document.getElementById('comboBar'),
          status: document.getElementById('statusVal'),
          rageBar: document.getElementById('rageBar'),
          rageWrap: document.getElementById('rageWrap'),
        };
      }
      this.el.score.textContent = this.points;
      this.el.status.textContent = this.levelNames[this.level];
      if (bump) {
        this.el.score.classList.remove('bump');
        void this.el.score.offsetWidth; // animasyonu yeniden başlat
        this.el.score.classList.add('bump');
      }
    },
  };
})();
