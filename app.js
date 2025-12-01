// Simple Lorenz attractor demo with RK4 integrator
(() => {
  // DOM
  const canvas = document.getElementById('viz');
  const ctx = canvas.getContext('2d', { antialias: true });
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stepBtn = document.getElementById('stepBtn');
  const resetBtn = document.getElementById('resetBtn');
  const randomBtn = document.getElementById('randomBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const sigmaEl = document.getElementById('sigma');
  const rhoEl = document.getElementById('rho');
  const betaEl = document.getElementById('beta');
  const dtEl = document.getElementById('dt');
  const speedEl = document.getElementById('speed');
  const trailEl = document.getElementById('trail');
  const showAxesEl = document.getElementById('showAxes');
  const colorByZEl = document.getElementById('colorByZ');

  const stepCountEl = document.getElementById('stepCount');
  const timeEl = document.getElementById('time');
  const ptsEl = document.getElementById('pts');

  // Canvas resolution scaling
  function resizeCanvas(){
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Model state
  let state = { x: 0.1, y: 0, z: 0 };
  let t = 0;
  let points = [];
  let running = false;
  let raf = null;
  let stepCounter = 0;

  // Defaults
  const defaults = {
    sigma: parseFloat(sigmaEl.value),
    rho: parseFloat(rhoEl.value),
    beta: parseFloat(betaEl.value),
    dt: parseFloat(dtEl.value)
  };

  function lorenz(s, params) {
    const { x, y, z } = s;
    const { sigma, rho, beta } = params;
    return {
      dx: sigma * (y - x),
      dy: x * (rho - z) - y,
      dz: x * y - beta * z
    };
  }

  function rk4Step(s, dt, params) {
    const k1 = lorenz(s, params);
    const s2 = { x: s.x + k1.dx * dt / 2, y: s.y + k1.dy * dt / 2, z: s.z + k1.dz * dt / 2 };
    const k2 = lorenz(s2, params);
    const s3 = { x: s.x + k2.dx * dt / 2, y: s.y + k2.dy * dt / 2, z: s.z + k2.dz * dt / 2 };
    const k3 = lorenz(s3, params);
    const s4 = { x: s.x + k3.dx * dt, y: s.y + k3.dy * dt, z: s.z + k3.dz * dt };
    const k4 = lorenz(s4, params);
    return {
      x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
      y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
      z: s.z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz)
    };
  }

  // Drawing helpers
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // background
    ctx.fillStyle = '#021018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawAxes() {
    if (!showAxesEl.checked) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, canvas.clientHeight - 10);
    ctx.lineTo(10, 10);
    ctx.moveTo(10, canvas.clientHeight - 10);
    ctx.lineTo(canvas.clientWidth - 10, canvas.clientHeight - 10);
    ctx.stroke();
    ctx.restore();
  }

  function project(pt, bounds) {
    // project x (horizontal) and z (vertical) into canvas
    const { xmin, xmax, zmin, zmax } = bounds;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const px = 40 + ((pt.x - xmin) / (xmax - xmin || 1)) * (W - 80);
    const py = 20 + ((zmax - pt.z) / (zmax - zmin || 1)) * (H - 60);
    return { px, py };
  }

  function computeBounds(pts) {
    if (pts.length === 0) return { xmin: -30, xmax: 30, zmin: -10, zmax: 50 };
    let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity;
    for (let p of pts) {
      if (p.x < xmin) xmin = p.x;
      if (p.x > xmax) xmax = p.x;
      if (p.z < zmin) zmin = p.z;
      if (p.z > zmax) zmax = p.z;
    }
    // pad
    const px = (xmax - xmin) * 0.12 || 1;
    const pz = (zmax - zmin) * 0.12 || 1;
    return { xmin: xmin - px, xmax: xmax + px, zmin: zmin - pz, zmax: zmax + pz };
  }

  function drawTrail() {
    const maxTrail = Math.max(100, Math.min(100000, parseInt(trailEl.value) || 8000));
    const ptsToDraw = points.slice(-maxTrail);
    const bounds = computeBounds(ptsToDraw);

    if (ptsToDraw.length < 2) return;

    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < ptsToDraw.length - 1; i++) {
      const p = project(ptsToDraw[i], bounds);
      const next = project(ptsToDraw[i + 1], bounds);
      if (colorByZEl.checked) {
        const z = ptsToDraw[i].z;
        // map z to color: blue -> cyan -> yellow -> red
        const t = Math.min(1, Math.max(0, (z - bounds.zmin) / (bounds.zmax - bounds.zmin)));
        const color = chroma(t);
        ctx.strokeStyle = color;
      } else {
        ctx.strokeStyle = 'rgba(102,217,239,0.9)';
      }
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(next.px, next.py);
      ctx.stroke();
    }
  }

  // Simple chroma mapping without external libs
  function chroma(t) {
    // t in [0,1]
    const r = Math.floor(255 * Math.min(1, Math.max(0, t * 2)));
    const g = Math.floor(255 * Math.min(1, Math.max(0, 2 * (1 - Math.abs(t - 0.5)))));
    const b = Math.floor(255 * Math.min(1, Math.max(0, (1 - t) * 2)));
    return `rgba(${r},${g},${b},0.95)`;
  }

  // Simulation loop
  function stepOnce(n = 1) {
    const params = {
      sigma: parseFloat(sigmaEl.value),
      rho: parseFloat(rhoEl.value),
      beta: parseFloat(betaEl.value)
    };
    const dt = parseFloat(dtEl.value);
    for (let i = 0; i < n; i++) {
      state = rk4Step(state, dt, params);
      t += dt;
      points.push({ x: state.x, y: state.y, z: state.z, t });
      stepCounter++;
    }
    stepCountEl.textContent = stepCounter;
    timeEl.textContent = t.toFixed(3);
    ptsEl.textContent = points.length;
  }

  function drawAll() {
    clearCanvas();
    drawAxes();
    drawTrail();
  }

  function loop(){
    const speed = parseInt(speedEl.value) || 1;
    // perform multiple tiny steps per frame depending on speed
    stepOnce(speed * 2);
    drawAll();
    if (running) raf = requestAnimationFrame(loop);
  }

  // Controls
  startBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stepBtn.disabled = true;
      raf = requestAnimationFrame(loop);
    }
  });

  pauseBtn.addEventListener('click', () => {
    running = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
    if (raf) cancelAnimationFrame(raf);
  });

  stepBtn.addEventListener('click', () => {
    stepOnce(1);
    drawAll();
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    state = { x: 0.1, y: 0, z: 0 };
    t = 0;
    points = [];
    stepCounter = 0;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
    drawAll();
    stepCountEl.textContent = '0';
    timeEl.textContent = '0.000';
    ptsEl.textContent = '0';
  });

  randomBtn.addEventListener('click', () => {
    state = {
      x: (Math.random() - 0.5) * 1.2,
      y: (Math.random() - 0.5) * 1.2,
      z: (Math.random() - 0.5) * 1.2 + 10
    };
    t = 0;
    points = [];
    stepCounter = 0;
    drawAll();
  });

  clearBtn.addEventListener('click', () => {
    points = [];
    stepCounter = 0;
    ptsEl.textContent = '0';
    drawAll();
  });

  exportBtn.addEventListener('click', () => {
    if (points.length === 0) {
      alert('No data to export — run the simulation for a bit first.');
      return;
    }
    let csv = 't,x,y,z\n';
    for (const p of points) {
      csv += `${p.t},${p.x},${p.y},${p.z}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorenz.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // initialization
  clearCanvas();
  drawAxes();

  // draw static welcome text
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = '14px system-ui, -apple-system, "Segoe UI", Roboto';
  ctx.fillText('Press Start to run the Lorenz ODE model', 40, 40);
  ctx.restore();

  // initial small pre-run to show attractor quickly
  for (let i = 0; i < 200; i++) stepOnce(1);
  drawAll();

})();