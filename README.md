# Astral Tactics

A 2D browser space battle game I’m building with JavaScript and the HTML5 Canvas API, inspired by classic tactical fleet games like *Thorvarium*.

Live Demo: [astraltactics.com](https://astraltactics.com)

---

## Why I Built This

I started this project as a Computer Science student to apply what I was learning in class to a real, working application. 

Instead of jumping straight into big game engines like Unity or Phaser, I wanted to build everything from scratch with pure JavaScript and `<canvas>`. I wanted to understand how things actually work under the hood: handling game loops, updating coordinates, detecting collisions, and managing user input without third-party abstractions.

---

## How I Built It & Using AI to Learn

Throughout this project, I treated AI tools (like ChatGPT) as a 24/7 tutor and pair-programming partner rather than an automatic code generator:

* **Breaking down math & physics:** I used AI to help me understand and implement vector math for ship drift, acceleration, and angle calculations on the 2D plane.
* **Troubleshooting input bugs:** When I ran into issues where shooting was interrupting movement (or keypresses were sticking), I used AI to talk through the event listeners and state management.
* **Code review:** I used it to check my code structure, help me spot bad habits early, and learn cleaner ways to separate game logic from rendering.

Using AI this way allowed me to learn much faster while still writing, testing, and debugging the code myself.

---

## Core Features

- **Custom Game Loop:** Uses `requestAnimationFrame` to handle physics updates and redraws smoothly.
- **Inertia & Movement:** Ships accelerate, turn, and drift in space using basic 2D vector physics.
- **Simultaneous Actions:** Movement, rotation, and shooting run concurrently without blocking each other.
- **Backend & Deploy:** Integrated with Firebase for basic persistence and hosted on Vercel.

---

## Tech Stack

- **Frontend:** JavaScript (ES6+), HTML5 Canvas, CSS3
- **Backend / Database:** Firebase
- **Hosting / Domain:** Vercel / Custom domain via IONOS

---

## What I Learned & What’s Next

**Key takeaways so far:**
- Managing canvas redraw cycles without tanking the frame rate.
- How tricky event handling gets when multiple keys are pressed at the same time.
- The importance of keeping object state separate from rendering logic.

**Next steps:**
- [ ] Refactor entity management to make adding new ship types easier.
- [ ] Improve collision accuracy for different projectile speeds.
- [ ] Add sound effects and better mobile/touch support.
