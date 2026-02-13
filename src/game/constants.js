export const TOTAL_WIDTH = 1024;
export const TOTAL_HEIGHT = 768;
export const HUD_HEIGHT = 140;
export const PLAY_HEIGHT = TOTAL_HEIGHT - HUD_HEIGHT;
export const TURN_TIME_LIMIT = 25;

export const MUSIC_TRACKS = [
  'assets/audio/music_1.mp3',
  'assets/audio/music_2.mp3',
  'assets/audio/music_3.mp3'
];

export const AUDIO_UI = {
  backgroundplayer: 'assets/ui/backgroundplayer.png',
  pause: 'assets/ui/pause.png',
  play: 'assets/ui/play.png',
  next: 'assets/ui/next.png',
  previous: 'assets/ui/previous.png',
  sound: 'assets/ui/sound.png',
  mute: 'assets/ui/mute.png'
};

export const SHIP_STATS = {
  FLUX: {
    id: 'FLUX', name: 'FLUX', descKey: 'DESC_FLUX', hp: 90, speed: 155, color: 0x00ffff, radius: 24, moveRange: 385, sprite: 'flux_img',
    hitRadius: 130,
    hitOffset: { x: 170, y: 200 }
  },
  VECTOR: {
    id: 'VECTOR', name: 'VECTOR', descKey: 'DESC_VECTOR', hp: 120, speed: 110, color: 0x00ff00, radius: 28, moveRange: 310, sprite: 'vector_img',
    hitRadius: 140,
    hitOffset: { x: 140, y: 180 }
  },
  COLOSSUS: {
    id: 'COLOSSUS', name: 'COLOSSUS', descKey: 'DESC_COLOSSUS', hp: 180, speed: 75, color: 0xffaa00, radius: 38, moveRange: 220, sprite: 'colossus_img',
    hitRadius: 150,
    hitOffset: { x: 150, y: 180 }
  }
};

export const SHIP_IMAGES = {
  flux_img: 'assets/Flux.png',
  vector_img: 'assets/Vector.png',
  colossus_img: 'assets/Colossus.png'
};

export const WEAPONS = {
  CANNON: { id: 'CANNON', name: 'CANNON', type: 'SINGLE', damage: 40, speed: 255, color: 0xb04dff, radius: 6 },
  FLAK: { id: 'FLAK', name: 'FLAK', type: 'SPREAD', damage: 15, speed: 340, color: 0xff9b2f, radius: 4 }
};

export const UI_THEME = {
  hud: {
    panelFill: 0x061120,
    panelLine: 0x1d8dff,
    panelGlow: 0x1dc8ff,
    turnText: '#47ff9a',
    labelText: '#e7f4ff',
    hpText: '#57ff84',
    spdText: '#59d7ff',
    dmgText: '#ff9640',
    timerText: '#dff6ff',
    timerDanger: '#ff4a4a',
    timerWaiting: '#ffb347'
  },
  button: {
    baseText: '#eaf7ff',
    purple: { fill: 0x2f0f58, inner: 0x221042, stroke: 0xc06bff, glow: 0x9f3dff, text: '#f2ddff' },
    orange: { fill: 0x5d2a09, inner: 0x45230f, stroke: 0xff9b2f, glow: 0xff8c1a, text: '#ffd970' },
    red: { fill: 0x4f0f13, inner: 0x361117, stroke: 0xff4a4a, glow: 0xff2929, text: '#ffd2d2' },
    green: { fill: 0x0e4a1f, inner: 0x10371c, stroke: 0x57ff8f, glow: 0x30ff74, text: '#d8ffe8' },
    gray: { fill: 0x1c2532, inner: 0x161d29, stroke: 0x667d9b, glow: 0x4e637d, text: '#c9d8e8' }
  }
};

export function generateMapData() {
  const obstacles = [];
  let attempts = 0;
  while (obstacles.length < 5 && attempts < 100) {
    attempts += 1;
    const x = Math.floor(Math.random() * (TOTAL_WIDTH - 200)) + 100;
    const y = Math.floor(Math.random() * (PLAY_HEIGHT - 300)) + 150;

    let tooClose = false;
    for (const obs of obstacles) {
      const dist = Math.sqrt(Math.pow(x - obs.x, 2) + Math.pow(y - obs.y, 2));
      if (dist < 130) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) obstacles.push({ x, y });
  }
  return obstacles;
}
