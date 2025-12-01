# Weather — Lorenz attractor model (ODE)

This is a small static demo that simulates the Lorenz system (a classic chaotic ODE system originally developed as a toy model for atmospheric convection). It runs entirely in the browser using a 4th-order Runge–Kutta integrator.

How to run
- Clone or download the repository.
- Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
- Use the controls to start/pause, change parameters (σ, ρ, β), adjust step size (dt) and speed, or export simulated data as CSV.

Files
- `index.html` — main page and UI
- `styles.css` — styles
- `app.js` — integrator, model, and rendering logic
- `README.md` — this file

Notes and ideas to extend
- Add multiple trajectories with different initial conditions to see divergence.
- Use WebGL for much faster rendering of very long trails.
- Add an analysis panel for Lyapunov exponent estimation or trajectory divergence.
- Connect to a simple backend to store/export larger datasets or parameter sweeps.

License
- Public domain / MIT-style usage — feel free to adapt for demos or teaching.