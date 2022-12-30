'use strict';

class Mouse {
  constructor(canvas) {
    this.pos = new Vector(-1000, -1000);
    this.radius = 40;

    canvas.onmousemove = (e) => this.pos.setXY(e.clientX, e.clientY);
    canvas.ontouchmove = (e) =>
      this.pos.setXY(e.touches[0].clientX, e.touches[0].clientY);
    canvas.ontouchcancel = () => this.pos.setXY(-1000, -1000);
    canvas.ontouchend = () => this.pos.setXY(-1000, -1000);
  }
}

class Dot {
  constructor(x, y) {
    this.id = Math.random();
    this.pos = new Vector(x, y);
    this.oldPos = new Vector(x, y);

    this.radius = 1;
    this.friction = 0.97;
    this.gravity = new Vector(0, 0.6);
    this.mass = 1;

    this.pinned = false;

    this.distMouse = 1000;

    this.lightImg = document.querySelector('#light-img');
    this.lightWidth = 15;
    this.lightHeight = 15;
  }

  update(mouse) {
    if (this.pinned) return;

    let vel = Vector.sub(this.pos, this.oldPos);
    vel.mult(this.friction);

    this.oldPos.setXY(this.pos.x, this.pos.y);
    vel.add(this.gravity);
    this.pos.add(vel);

    let { x: dx, y: dy } = Vector.sub(this.pos, mouse.pos);

    this.distMouse = Math.sqrt(dx * dx + dy * dy);

    if (this.distMouse > mouse.radius + this.radius) return;
    const direction = new Vector(dx / this.distMouse, dy / this.distMouse);

    let force = (mouse.radius - this.distMouse) / mouse.radius;

    if (force < 0) force = 0;
    if (force < 0.6) {
      this.pos.sub(direction.mult(force).mult(0.0001));
    } else {
      this.pos.setXY(mouse.pos.x, mouse.pos.y);
    }
  }

  drawLight(ctx) {
    ctx.drawImage(
      this.lightImg,
      this.pos.x - this.lightWidth / 2,
      this.pos.y - this.lightHeight / 2,
      this.lightWidth,
      this.lightHeight
    );
  }

  draw(ctx) {
    ctx.fillStyle = '#aaa';
    ctx.fillRect(
      this.pos.x - this.radius,
      this.pos.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
  }
}

class Stick {
  constructor(p1, p2) {
    this.startPoint = p1;
    this.endPoint = p2;

    this.tension = 1;
    this.color = '#999';
    this.length = this.startPoint.pos.dist(this.endPoint.pos);
  }

  update() {
    const dx = this.endPoint.pos.x - this.startPoint.pos.x;
    const dy = this.endPoint.pos.y - this.startPoint.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const diff = ((this.length - dist) / dist) * this.tension;

    const offsetX = dx * diff * 0.5;
    const offsetY = dy * diff * 0.5;

    const m = this.endPoint.mass + this.startPoint.mass;
    const m1 = this.endPoint.mass / m;
    const m2 = this.startPoint.mass / m;

    if (!this.startPoint.pinned) {
      this.startPoint.pos.x -= offsetX * m1;
      this.startPoint.pos.y -= offsetY * m1;
    }

    if (!this.endPoint.pinned) {
      this.endPoint.pos.x += offsetX * m2;
      this.endPoint.pos.y += offsetY * m2;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.moveTo(this.startPoint.pos.x, this.startPoint.pos.y);
    ctx.lineTo(this.endPoint.pos.x, this.endPoint.pos.y);
    ctx.stroke();
    ctx.closePath();
  }
}

class Rope {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.segments = config.segments || 10;
    this.gap = config.gap || 15;
    this.color = config.color || 'gray';

    this.dots = [];
    this.sticks = [];

    this.iterations = 10;

    this.create();
  }

  pin(index) {
    this.dots[index].pinned = true;
  }

  create() {
    for (let i = 0; i < this.segments; i++) {
      this.dots.push(new Dot(this.x, this.y + i * this.gap));
    }
    for (let i = 0; i < this.segments - 1; i++) {
      this.sticks.push(new Stick(this.dots[i], this.dots[i + 1]));
    }
  }

  update(mouse) {
    this.dots.forEach((dot) => {
      dot.update(mouse);
    });
    for (let i = 0; i < this.iterations; i++) {
      this.sticks.forEach((stick) => {
        stick.update();
      });
    }
  }

  draw(ctx) {
    this.dots.forEach((dot) => {
      dot.draw(ctx);
    });
    this.sticks.forEach((stick) => {
      stick.draw(ctx);
    });
    this.dots[this.dots.length - 1].drawLight(ctx);
  }
}

class App {
  static width = innerWidth;
  static height = innerHeight;
  static dpr = devicePixelRatio > 1 ? 2 : 1;
  static interval = 1000 / 60;

  constructor() {
    this.canvas = document.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    this.mouse = new Mouse(this.canvas);

    this.createRopes();
  }

  createRopes() {
    this.ropes = [];

    const TOTAL = App.width * 0.06;
    for (let i = 0; i < TOTAL + 1; i++) {
      const x = randomNumBetween(App.width * 0.3, App.width * 0.7);
      const y = 0;
      const gap = randomNumBetween(App.height * 0.05, App.height * 0.08);
      const segments = 10;
      const rope = new Rope({ x, y, gap, segments });
      rope.pin(0);

      this.ropes.push(rope);
    }
  }

  resize() {
    App.width = innerWidth;
    App.height = innerHeight;

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = App.width * App.dpr;
    this.canvas.height = App.height * App.dpr;
    this.ctx.scale(App.dpr, App.dpr);

    this.createRopes();
  }

  render() {
    let now, delta;
    let then = Date.now();

    const frame = () => {
      requestAnimationFrame(frame);
      now = Date.now();
      delta = now - then;
      if (delta < App.interval) return;
      then = now - (delta % App.interval);
      this.ctx.clearRect(0, 0, App.width, App.height);

      // draw here
      this.ropes.forEach((rope) => {
        rope.update(this.mouse);
        rope.draw(this.ctx);
      });
    };
    requestAnimationFrame(frame);
  }
}

function randomNumBetween(min, max) {
  return Math.random() * (max - min) + min;
}

window.addEventListener('load', () => {
  const app = new App();
  app.render();
});

/**
 * Vector.js v1.0.0
 * @author Anurag Hazra
 * @borrows p5.Vector
 * @param {number} x
 * @param {number} y
 */
function Vector(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

// Static Functions
Vector.dist = function (v1, v2) {
  return v1.dist(v2);
};
Vector.distSq = function (v1, v2) {
  return v1.distSq(v2);
};
Vector.sub = function (v1, v2) {
  return new Vector(v1.x - v2.x, v1.y - v2.y);
};
Vector.add = function (v1, v2) {
  return new Vector(v1.x + v2.x, v1.y + v2.y);
};
Vector.fromAngle = function (angle) {
  let v = new Vector(0, 0);
  v.x = Math.cos(angle);
  v.y = Math.sin(angle);
  return v;
};
Vector.random2D = function (v) {
  return Vector.fromAngle(Math.random() * Math.PI * 180);
};

Vector.prototype = {
  add: function (x, y) {
    if (arguments.length === 1) {
      this.x += x.x;
      this.y += x.y;
    } else if (arguments.length === 2) {
      this.x += x;
      this.y += y;
    }
    return this;
  },
  sub: function (x, y) {
    if (arguments.length === 1) {
      this.x -= x.x;
      this.y -= x.y;
    } else if (arguments.length === 2) {
      this.x -= x;
      this.y -= y;
    }
    return this;
  },
  mult: function (v) {
    if (typeof v === 'number') {
      this.x *= v;
      this.y *= v;
    } else {
      this.x *= v.x;
      this.y *= v.y;
    }
    return this;
  },
  div: function (v) {
    if (typeof v === 'number') {
      this.x /= v;
      this.y /= v;
    } else {
      this.x /= v.x;
      this.y /= v.y;
    }
    return this;
  },
  setAngle: function (angle) {
    var len = this.mag();
    this.x = Math.cos(angle) * len;
    this.y = Math.sin(angle) * len;
  },
  mag: function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  },
  magSq: function () {
    return this.x * this.x + this.y * this.y;
  },
  setXY: function (x, y) {
    this.x = x;
    this.y = y;
    return this;
  },
  setMag: function (value) {
    this.normalize();
    this.mult(value);
    return this;
  },
  normalize: function () {
    let m = this.mag();
    if (m > 0) {
      this.div(m);
    }
    return this;
  },
  limit: function (max) {
    if (this.mag() > max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  },
  heading: function () {
    return -Math.atan2(-this.y, this.x);
  },
  dist: function (v) {
    let dx = this.x - v.x;
    let dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  distSq: function (v) {
    let dx = this.x - v.x;
    let dy = this.y - v.y;
    return dx * dx + dy * dy;
  },
  copy: function () {
    return new Vector(this.x, this.y);
  },
  negative: function () {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  },
  array: function () {
    return [this.x, this.y];
  },
  toString: function () {
    return '[' + this.x + ', ' + this.y + ', ' + this.z + ']';
  },
  project: function (v) {
    var coeff = (this.x * v.x + this.y * v.y) / (v.x * v.x + v.y * v.y);
    this.x = coeff * v.x;
    this.y = coeff * v.y;
    return this;
  },
  rotate: function (a) {
    var b = this.heading() + a;
    var c = this.mag();
    this.x = Math.cos(b) * c;
    this.y = Math.sin(b) * c;
  },
};
