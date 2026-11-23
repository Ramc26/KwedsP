(function (window) {
  "use strict";

  var stream = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    falling: [],
    loopStarted: false,
    continuous: false
  };

  var PETAL_COLORS_WEDDING = [
    ["#ff8a96", "#9b1c31"],
    ["#e63950", "#6e0f1f"],
    ["#ffb3bc", "#a81830"],
    ["#d62845", "#5c0a18"],
    ["#ffc9cf", "#8f1428"],
    ["#c1122f", "#4a0812"]
  ];

  var PETAL_COLORS_RECEPTION = [
    ["#ffe0a3", "#c97808"],
    ["#ffd59a", "#a65c12"],
    ["#fff0d0", "#e4a01a"],
    ["#f5c97a", "#8a4b0a"],
    ["#ffe8b8", "#b86b12"]
  ];

  function getShowerCanvas() {
    return document.getElementById("flowerShowerCanvas");
  }

  function randomPetalColors() {
    var reception = document.body && document.body.classList.contains("invite-reception");
    var palette = reception ? PETAL_COLORS_RECEPTION : PETAL_COLORS_WEDDING;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function drawRosePetalNatural(ctx, w, h, fillTop, fillBottom, alpha) {
    ctx.globalAlpha = alpha;
    var grad = ctx.createLinearGradient(-w * 0.2, -h, w * 0.3, h);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(0.55, fillBottom);
    grad.addColorStop(1, fillBottom);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.96);
    ctx.bezierCurveTo(w * 1.05, -h * 0.42, w * 0.82, h * 0.38, w * 0.08, h * 0.92);
    ctx.bezierCurveTo(-w * 0.12, h * 0.55, -w * 0.65, h * 0.05, -w * 0.45, -h * 0.55);
    ctx.bezierCurveTo(-w * 0.35, -h * 0.82, -w * 0.15, -h * 0.98, 0, -h * 0.96);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(60, 8, 18, 0.14)";
    ctx.lineWidth = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function FallingPetal(x, y) {
    var colors = randomPetalColors();
    this.x =
      typeof x === "number"
        ? x + (Math.random() - 1) * 24
        : Math.random() * (stream.width || window.innerWidth);
    this.y = typeof y === "number" ? y : -40 - Math.random() * 220;
    this.vy = Math.random() * 2.2 + 1.4;
    this.vx = (Math.random() - 0.5) * 1.8;
    this.size = Math.random() * 14 + 12;
    this.rot = Math.random() * Math.PI * 2;
    this.vrot = (Math.random() - 0.5) * 0.06;
    this.opacity = 0.75 + Math.random() * 0.25;
    this.petalFill = colors[0];
    this.petalStroke = colors[1];
  }

  FallingPetal.prototype.update = function () {
    var floor = (stream.height || window.innerHeight) + 40;
    this.y += this.vy;
    this.x += this.vx + Math.sin(this.y * 0.012) * 0.35;
    this.rot += this.vrot;
    if (this.y > floor - 120) {
      this.opacity -= 0.02;
    }
    if (this.y >= floor || this.opacity <= 0) {
      this.opacity = 0;
    }
  };

  FallingPetal.prototype.draw = function (ctx) {
    if (this.opacity <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    drawRosePetalNatural(
      ctx,
      this.size * 0.52,
      this.size * 1.05,
      this.petalFill,
      this.petalStroke,
      this.opacity
    );
    ctx.restore();
  };

  function sizeStreamCanvas() {
    var canvas = stream.canvas || getShowerCanvas();
    if (!canvas) return;
    stream.canvas = canvas;
    stream.ctx = canvas.getContext("2d");
    stream.width = document.documentElement.clientWidth || window.innerWidth;
    stream.height = document.documentElement.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(stream.width * dpr);
    canvas.height = Math.floor(stream.height * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    stream.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnPetals(n) {
    for (var i = 0; i < n; i++) {
      stream.falling.push(new FallingPetal());
    }
  }

  function animateFlowerStream() {
    if (!stream.ctx) {
      requestAnimationFrame(animateFlowerStream);
      return;
    }

    stream.ctx.clearRect(0, 0, stream.width, stream.height);

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      // Continuous rain: keep ~8–15 petals on screen
      if (stream.continuous) {
        var count = stream.falling.length;
        if (count < 8) {
          spawnPetals(1 + Math.floor(Math.random() * 3));
        } else if (count < 15 && Math.random() < 0.06) {
          spawnPetals(1 + Math.floor(Math.random() * Math.min(3, 15 - count)));
        }
      }

      for (var i = stream.falling.length - 1; i >= 0; i--) {
        var p = stream.falling[i];
        p.update();
        p.draw(stream.ctx);
        if (p.opacity <= 0) stream.falling.splice(i, 1);
      }
    }

    if (stream.canvas) {
      stream.canvas.setAttribute(
        "aria-hidden",
        stream.falling.length ? "false" : "true"
      );
    }

    requestAnimationFrame(animateFlowerStream);
  }

  function initFlowerStream() {
    if (stream.loopStarted) return;
    stream.loopStarted = true;
    sizeStreamCanvas();
    window.addEventListener("resize", sizeStreamCanvas);
    requestAnimationFrame(animateFlowerStream);
  }

  /** Heavy initial burst, then continuous drizzle (~8–15 on screen). */
  function playRosePetals() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (stream.continuous) return;
    initFlowerStream();
    sizeStreamCanvas();
    stream.continuous = true;
    var canvas = getShowerCanvas();
    if (canvas) canvas.setAttribute("aria-hidden", "false");
    spawnPetals(200);
  }

  function init() {
    /* Petal shower disabled — keep API for compatibility */
  }

  window.KwedsInteractive = {
    init: init,
    playRosePetals: function () {}
  };
})(window);
