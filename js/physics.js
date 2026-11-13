/* ============================================================
   FİZİK DÜNYASI
   Matter.js motoru, ekran kenarındaki duvarlar ve
   fareyle / parmakla tutup fırlatma.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const M = window.Matter;
  const WALL = 400;       // duvar kalınlığı (kalın olsun ki hızlı giden içinden geçemesin)
  const MAX_SPEED = 55;   // bir parçanın ulaşabileceği en yüksek hız

  const P = (Oyun.physics = {
    engine: null,
    world: null,
    walls: [],
    W: 0, H: 0, groundY: 0,
    grabC: null,          // tutma bağı
    grabbedBody: null,

    init: function () {
      if (this.engine) return;
      this.engine = M.Engine.create();
      this.engine.constraintIterations = 4;
      this.engine.positionIterations = 8;
      this.engine.velocityIterations = 6;
      this.world = this.engine.world;
    },

    /* Duvarları ekran boyutuna göre (yeniden) kurar. */
    setBounds: function (W, H, groundY) {
      this.W = W; this.H = H; this.groundY = groundY;
      if (this.walls.length) M.Composite.remove(this.world, this.walls);
      const o = { isStatic: true, label: 'wall', friction: 0.8, restitution: 0.4 };
      this.walls = [
        M.Bodies.rectangle(W / 2, groundY + WALL / 2, W + WALL * 2, WALL, o),   // zemin
        M.Bodies.rectangle(W / 2, -WALL / 2, W + WALL * 2, WALL, o),            // tavan
        M.Bodies.rectangle(-WALL / 2, H / 2, WALL, H + WALL * 2, o),            // sol
        M.Bodies.rectangle(W + WALL / 2, H / 2, WALL, H + WALL * 2, o),         // sağ
      ];
      M.Composite.add(this.world, this.walls);
    },

    /* Bir fizik adımı. bodies: hızı sınırlanacak parçalar. */
    step: function (dt, bodies) {
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.speed > MAX_SPEED) {
          const k = MAX_SPEED / b.speed;
          M.Body.setVelocity(b, { x: b.velocity.x * k, y: b.velocity.y * k });
        }
      }
      M.Engine.update(this.engine, dt);
    },

    /* Bir parça bir şekilde dışarı kaçtı mı? */
    isOutside: function (b) {
      const p = b.position;
      return p.x < -60 || p.x > this.W + 60 || p.y < -60 || p.y > this.groundY + 60 || !isFinite(p.x) || !isFinite(p.y);
    },

    /* Tutup fırlatma: canvas üzerinde işaretçi olaylarını bağlar.
       getBodies(): tutulabilir parçalar; cb.onGrab / cb.onRelease isteğe bağlı. */
    bindGrab: function (canvas, getBodies, cb) {
      const self = this;
      cb = cb || {};

      function pos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }

      function release() {
        if (!self.grabC) return;
        M.Composite.remove(self.world, self.grabC);
        self.grabC = null;
        self.grabbedBody = null;
        canvas.classList.remove('grabbing');
        if (cb.onRelease) cb.onRelease();
      }

      canvas.addEventListener('pointerdown', function (e) {
        if (self.grabC) return;
        const p = pos(e);
        const bodies = getBodies();
        let body = M.Query.point(bodies, p)[0];
        if (!body) {
          // Tam üstüne basılmadıysa yakındaki parçayı tut
          let best = 45;
          bodies.forEach(function (b) {
            const d = Math.hypot(b.position.x - p.x, b.position.y - p.y);
            if (d < best) { best = d; body = b; }
          });
        }
        if (!body) return;
        self.grabbedBody = body;
        self.grabC = M.Constraint.create({
          pointA: p,
          bodyB: body,
          pointB: { x: p.x - body.position.x, y: p.y - body.position.y },
          length: 0,
          stiffness: 0.15,
          damping: 0.1,
        });
        M.Composite.add(self.world, self.grabC);
        canvas.classList.add('grabbing');
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* önemli değil */ }
        if (cb.onGrab) cb.onGrab(body);
      });

      canvas.addEventListener('pointermove', function (e) {
        if (self.grabC) self.grabC.pointA = pos(e);
      });
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      this.releaseGrab = release;
    },

    releaseGrab: function () {},
  });
})();
