/* ============================================================
   BEZ BEBEK (RAGDOLL)
   Kafa, gövde, 2 kol (üst+alt) ve 2 bacak (üst+alt) parçaları
   eklemlerle birbirine bağlıdır. Yüz kafanın üstüne çizilir.
   ============================================================ */
(function () {
  'use strict';
  const Oyun = (window.Oyun = window.Oyun || {});
  const M = window.Matter;
  const INK = '#2b2b3a';
  const COLORS = { shirt: '#4cc9f0', shirtStripe: '#ffffff', pants: '#3d348b', skin: '#ffd9b0', shoe: '#2b2b3a' };

  // Çizim sırası (arkadan öne)
  const ORDER = ['uArmL', 'lArmL', 'uLegL', 'lLegL', 'uLegR', 'lLegR', 'torso', 'uArmR', 'lArmR', 'head'];

  const R = (Oyun.ragdoll = {
    parts: null,       // isim -> Matter gövdesi
    bodies: [],
    joints: [],
    standC: [],        // ayakta tutan görünmez ipler
    standing: false,
    S: 1,              // ölçek
    dazedUntil: 0,
    lastDisturb: 0,

    /* Bebeği (x, groundY) noktasında ayakta duracak şekilde kurar. */
    build: function (x, gy, scale) {
      this.destroy();
      const world = Oyun.physics.world;
      const S = (this.S = scale);
      const group = M.Body.nextGroup(true); // parçalar birbirine çarpmasın
      const parts = (this.parts = {});

      function opts(extra) {
        return Object.assign({
          collisionFilter: { group: group },
          friction: 0.6, frictionAir: 0.012, restitution: 0.35,
          label: 'ragdoll',
        }, extra || {});
      }
      function rect(name, cx, cy, w, h) {
        const b = M.Bodies.rectangle(x + cx * S, gy + cy * S, w * S, h * S,
          opts({ chamfer: { radius: Math.min(w, h) * S * 0.4 } }));
        b.rd = { name: name, w: w * S, h: h * S };
        parts[name] = b;
      }

      // Parçalar (konumlar: bebeğin ayak ortasına göre)
      const head = M.Bodies.circle(x, gy - 232 * S, 36 * S, opts());
      head.rd = { name: 'head', r: 36 * S };
      parts.head = head;
      rect('torso', 0, -152, 60, 96);
      rect('uArmL', -40, -167, 18, 46);
      rect('lArmL', -40, -123, 16, 46);
      rect('uArmR', 40, -167, 18, 46);
      rect('lArmR', 40, -123, 16, 46);
      rect('uLegL', -15, -78, 22, 52);
      rect('lLegL', -15, -26, 20, 52);
      rect('uLegR', 15, -78, 22, 52);
      rect('lLegR', 15, -26, 20, 52);

      // Eklemler (dünya koordinatında bir nokta verip iki parçayı oradan bağlarız)
      const joints = (this.joints = []);
      function joint(a, b, jx, jy) {
        const wx = x + jx * S, wy = gy + jy * S;
        joints.push(M.Constraint.create({
          bodyA: parts[a], pointA: { x: wx - parts[a].position.x, y: wy - parts[a].position.y },
          bodyB: parts[b], pointB: { x: wx - parts[b].position.x, y: wy - parts[b].position.y },
          length: 0, stiffness: 0.95, damping: 0.1,
        }));
      }
      joint('torso', 'head', 0, -200);     // boyun
      joint('torso', 'uArmL', -36, -186);  // omuzlar
      joint('torso', 'uArmR', 36, -186);
      joint('uArmL', 'lArmL', -40, -145);  // dirsekler
      joint('uArmR', 'lArmR', 40, -145);
      joint('torso', 'uLegL', -15, -102);  // kalçalar
      joint('torso', 'uLegR', 15, -102);
      joint('uLegL', 'lLegL', -15, -52);   // dizler
      joint('uLegR', 'lLegR', 15, -52);
      // Boyun desteği: kafa pörsümesin, gövdeyle aynı hizada kalsın
      joints.push(M.Constraint.create({
        bodyA: parts.torso, bodyB: parts.head, stiffness: 0.35, damping: 0.1,
      }));

      this.bodies = ORDER.map(function (n) { return parts[n]; });
      M.Composite.add(world, this.bodies);
      M.Composite.add(world, joints);

      this.dazedUntil = 0;
      this.lastDisturb = performance.now();
      this.setStanding(true, x);
    },

    destroy: function () {
      if (!this.parts) return;
      const world = Oyun.physics.world;
      this.setStanding(false);
      M.Composite.remove(world, this.joints);
      M.Composite.remove(world, this.bodies);
      this.parts = null;
      this.bodies = [];
      this.joints = [];
    },

    /* Ayakta durma: kafayı yukarıdan, ayakları yerden tutan yumuşak ipler.
       İlk darbede ipler kopar ve bebek serbest kalır. */
    setStanding: function (on, x) {
      const world = Oyun.physics.world;
      if (this.standC.length) {
        M.Composite.remove(world, this.standC);
        this.standC = [];
      }
      this.standing = false;
      if (!on || !this.parts) return;

      const S = this.S, gy = Oyun.physics.groundY, p = this.parts;
      const margin = 80 * S;
      x = Math.max(margin, Math.min(Oyun.physics.W - margin, x));
      const foot = function (leg, dx) {
        return M.Constraint.create({
          pointA: { x: x + dx * S, y: gy - 2 * S },
          bodyB: leg, pointB: M.Vector.rotate({ x: 0, y: 24 * S }, leg.angle),
          length: 0, stiffness: 0.03, damping: 0.15,
        });
      };
      this.standC = [
        M.Constraint.create({
          pointA: { x: x, y: gy - 232 * S }, bodyB: p.head, pointB: { x: 0, y: 0 },
          length: 0, stiffness: 0.05, damping: 0.15,
        }),
        foot(p.lLegL, -15),
        foot(p.lLegR, 15),
      ];
      M.Composite.add(world, this.standC);
      this.standing = true;
    },

    /* Darbe: hedef parçaya tam, diğerlerine kısmi hız ekler; böylece
       bütün bebek savrulur ama darbe yiyen yer öne geçer. */
    hit: function (targetName, dvx, dvy, spin) {
      if (!this.parts) return;
      this.setStanding(false);
      const target = this.parts[targetName] || this.parts.torso;
      this.bodies.forEach(function (b) {
        const k = b === target ? 1 : 0.55;
        M.Body.setVelocity(b, { x: b.velocity.x + dvx * k, y: b.velocity.y + dvy * k });
      });
      M.Body.setAngularVelocity(target, target.angularVelocity + spin);
      M.Body.setAngularVelocity(this.parts.torso, this.parts.torso.angularVelocity + spin * 0.5);
      this.disturb();
    },

    disturb: function () { this.lastDisturb = performance.now(); },
    daze: function (ms) { this.dazedUntil = Math.max(this.dazedUntil, performance.now() + ms); },
    isDazed: function (now) { return now < this.dazedUntil; },

    /* Her karede çağrılır: bir süre rahat bırakılırsa kendiliğinden ayağa kalkar. */
    update: function (now) {
      if (!this.parts) return;
      if (Oyun.physics.grabbedBody) { this.disturb(); return; }
      if (!this.standing && now - this.lastDisturb > 2800 && this.parts.torso.speed < 1.5) {
        this.setStanding(true, this.parts.torso.position.x);
      }
    },

    /* ---------- Çizim ---------- */
    draw: function (ctx, now, level) {
      if (!this.parts) return;
      const S = this.S, t = now / 1000;
      ctx.lineJoin = 'round';

      // Yerdeki gölge
      const tp = this.parts.torso.position;
      const gy = Oyun.physics.groundY;
      const hgt = Math.max(0, Math.min(1, (gy - tp.y) / (400 * S)));
      ctx.fillStyle = 'rgba(0,0,0,' + (0.22 - hgt * 0.14) + ')';
      ctx.beginPath();
      ctx.ellipse(tp.x, gy + 6, (70 - hgt * 30) * S, (12 - hgt * 5) * S, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i], d = b.rd;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3 * S;

        if (d.name === 'head') {
          if (level >= 4) Oyun.face.drawBump(ctx, d.r, t);
          Oyun.face.draw(ctx, d.r, { level: level, dazed: this.isDazed(now), t: t });
          ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.stroke();
        } else if (d.name === 'torso') {
          Oyun.roundRect(ctx, -d.w / 2, -d.h / 2, d.w, d.h, 14 * S);
          ctx.fillStyle = COLORS.shirt; ctx.fill();
          ctx.save(); ctx.clip();
          ctx.fillStyle = COLORS.shirtStripe;
          ctx.fillRect(-d.w / 2, -d.h * 0.18, d.w, d.h * 0.14);
          ctx.fillStyle = COLORS.pants;
          ctx.fillRect(-d.w / 2, d.h * 0.28, d.w, d.h * 0.3);
          ctx.restore();
          ctx.stroke();
        } else {
          const isArm = d.name.indexOf('Arm') > 0, lower = d.name[0] === 'l';
          if (lower && !isArm) { // ayakkabı
            ctx.fillStyle = COLORS.shoe;
            ctx.beginPath(); ctx.ellipse(4 * S, d.h / 2 - 3 * S, 15 * S, 9 * S, 0, 0, Math.PI * 2); ctx.fill();
          }
          Oyun.roundRect(ctx, -d.w / 2, -d.h / 2, d.w, d.h, d.w * 0.45);
          ctx.fillStyle = isArm ? (lower ? COLORS.skin : COLORS.shirt) : COLORS.pants;
          ctx.fill(); ctx.stroke();
          if (lower && isArm) { // el
            ctx.fillStyle = COLORS.skin;
            ctx.beginPath(); ctx.arc(0, d.h / 2, 10 * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
        ctx.restore();
      }
    },
  });
})();
