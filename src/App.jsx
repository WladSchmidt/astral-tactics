import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';

// 🔥 FIREBASE
import { db, auth } from './firebaseConfig';
import { ref, set, get, onValue, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';

// --- DIMENSÕES FIXAS ---
const TOTAL_WIDTH = 1024;
const TOTAL_HEIGHT = 768;
const HUD_HEIGHT = 140;
const PLAY_HEIGHT = TOTAL_HEIGHT - HUD_HEIGHT;
const TURN_TIME_LIMIT = 25;

// --- LISTA DE MÚSICAS ---
const MUSIC_TRACKS = [
  'assets/audio/music_1.mp3',
  'assets/audio/music_2.mp3',
  'assets/audio/music_3.mp3'
];

// --- SISTEMA DE TRADUÇÃO ---
const TEXTS = {
  PT: {
    MAIN_TITLE: "PREPARE-SE PARA A BATALHA",
    MAIN_SUBTITLE: "DERROTE A IA OU DESAFIE UM AMIGO",
    BTN_TRAINING: "⚔️ TREINO SOLO (VS IA)",
    HOST_TITLE: "CRIAR SALA",
    HOST_BTN: "CRIAR",
    GUEST_TITLE: "ENTRAR EM SALA",
    GUEST_BTN: "ENTRAR",
    INPUT_PLACEHOLDER: "CÓDIGO",
    STATUS_CREATING: "Criando sala...",
    STATUS_CREATED: "SALA CRIADA: {0} (Aguardando P2...)",
    STATUS_P2_CONNECTED: "JOGADOR 2 CONECTADO!",
    STATUS_JOINING: "Entrando...",
    STATUS_NOT_FOUND: "Sala não encontrada!",
    STATUS_ERROR: "Erro: ",
    ROOM_LABEL: "SALA:",
    SELECT_INSTRUCT: "ESCOLHA 3 NAVES",
    BTN_READY: "CONFIRMAR FROTA",
    STATUS_WAITING: "AGUARDANDO OPONENTE...",
    TURN_YOURS: "SUA VEZ",
    TURN_OPP: "VEZ DO OPONENTE",
    SELECT_SHIP: "SELECIONE UMA NAVE",
    BTN_EXECUTE: "EXECUTAR",
    BTN_MOVE: "X MOVER",
    BTN_ATK: "X ATACAR",
    TIMER_LABEL: "TEMPO: ",
    WAITING_LABEL: "AGUARDANDO...",
    EXECUTING_LABEL: "PROCESSANDO...",
    BLOCKED_LABEL: "BLOQUEADO",
    CRASH_LABEL: "COLISÃO!",
    BTN_SURRENDER: "🏳️ RENDER-SE",
    SURRENDER_CONFIRM: "Tem certeza? Isso contará como DERROTA.",
    VICTORY: "VITÓRIA",
    DEFEAT: "DERROTA",
    DRAW: "EMPATE",
    BTN_RESTART: "REINICIAR",
    BTN_MENU: "MENU PRINCIPAL",
    DESC_FLUX: "Alta velocidade, baixa vida.",
    DESC_VECTOR: "Status balanceados.",
    DESC_COLOSSUS: "Tanque pesado, muito lento."
  },
  EN: {
    MAIN_TITLE: "PREPARE FOR BATTLE",
    MAIN_SUBTITLE: "DEFEAT THE AI OR CHALLENGE A FRIEND",
    BTN_TRAINING: "⚔️ SOLO TRAINING (VS AI)",
    HOST_TITLE: "HOST GAME",
    HOST_BTN: "CREATE",
    GUEST_TITLE: "JOIN GAME",
    GUEST_BTN: "JOIN",
    INPUT_PLACEHOLDER: "CODE",
    STATUS_CREATING: "Creating room...",
    STATUS_CREATED: "ROOM CREATED: {0} (Waiting P2...)",
    STATUS_P2_CONNECTED: "PLAYER 2 CONNECTED!",
    STATUS_JOINING: "Joining...",
    STATUS_NOT_FOUND: "Room not found!",
    STATUS_ERROR: "Error: ",
    ROOM_LABEL: "ROOM:",
    SELECT_INSTRUCT: "SELECT 3 SHIPS",
    BTN_READY: "CONFIRM FLEET",
    STATUS_WAITING: "WAITING FOR OPPONENT...",
    TURN_YOURS: "YOUR TURN",
    TURN_OPP: "OPPONENT'S TURN",
    SELECT_SHIP: "SELECT A SHIP",
    BTN_EXECUTE: "EXECUTE",
    BTN_MOVE: "X MOVE",
    BTN_ATK: "X ATTACK",
    TIMER_LABEL: "TIME: ",
    WAITING_LABEL: "WAITING...",
    EXECUTING_LABEL: "EXECUTING...",
    BLOCKED_LABEL: "BLOCKED",
    CRASH_LABEL: "CRASH!",
    BTN_SURRENDER: "🏳️ SURRENDER",
    SURRENDER_CONFIRM: "Are you sure? This counts as DEFEAT.",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT",
    DRAW: "DRAW",
    BTN_RESTART: "RESTART",
    BTN_MENU: "MAIN MENU",
    DESC_FLUX: "High speed, low HP.",
    DESC_VECTOR: "Balanced stats.",
    DESC_COLOSSUS: "Heavy tank, very slow."
  }
};

// ✅ SHIP_STATS: VALORES ORIGINAIS RESTAURADOS
// Voltamos ao raio 150 e offsets manuais, pois a correção visual será feita no spawnShip
const SHIP_STATS = {
  FLUX: { 
    id: 'FLUX', name: 'FLUX', descKey: 'DESC_FLUX', hp: 90, speed: 155, color: 0x00ffff, radius: 24, moveRange: 385, sprite: 'flux_img', 
    hitRadius: 150, 
    hitOffset: { x: 170, y: 200 } 
  },
  VECTOR: { 
    id: 'VECTOR', name: 'VECTOR', descKey: 'DESC_VECTOR', hp: 120, speed: 110, color: 0x00ff00, radius: 28, moveRange: 310, sprite: 'vector_img', 
    hitRadius: 150, 
    hitOffset: { x: 140, y: 180 } 
  },
  COLOSSUS: { 
    id: 'COLOSSUS', name: 'COLOSSUS', descKey: 'DESC_COLOSSUS', hp: 180, speed: 75, color: 0xffaa00, radius: 38, moveRange: 220, sprite: 'colossus_img', 
    hitRadius: 155, 
    hitOffset: { x: 150, y: 180 } 
  }
};

const SHIP_IMAGES = { 'flux_img': 'assets/Flux.png', 'vector_img': 'assets/Vector.png', 'colossus_img': 'assets/Colossus.png' };

const WEAPONS = {
  CANNON: { id: 'CANNON', name: 'CANNON', type: 'SINGLE', damage: 40, speed: 255, color: 0xffff00, radius: 6 },
  FLAK: { id: 'FLAK', name: 'FLAK', type: 'SPREAD', damage: 15, speed: 340, color: 0xff4400, radius: 4 }
};

const generateMapData = () => {
  const obstacles = [];
  let attempts = 0;
  while (obstacles.length < 5 && attempts < 100) {
    attempts++;
    const x = Math.floor(Math.random() * (TOTAL_WIDTH - 200)) + 100;
    const y = Math.floor(Math.random() * (PLAY_HEIGHT - 300)) + 150;
    let tooClose = false;
    for (let obs of obstacles) {
      const dist = Math.sqrt(Math.pow(x - obs.x, 2) + Math.pow(y - obs.y, 2));
      if (dist < 130) { tooClose = true; break; }
    }
    if (!tooClose) obstacles.push({ x, y });
  }
  return obstacles;
};
export default function App() {
  const [lang, setLang] = useState('PT');
  const [gameState, setGameState] = useState('LOBBY');
  const [mySquad, setMySquad] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [runId, setRunId] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  // --- ÁUDIO GLOBAL ---
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef(null);

  const t = (key) => TEXTS[lang][key] || key;
  const surrenderHandledRef = useRef(false);

  // AUTOPLAY LÓGICA
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.3;
    if (isGlobalMuted) {
      audioRef.current.pause();
    } else if (isMusicPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const unlockAudio = () => {
            if (audioRef.current && isMusicPlaying && !isGlobalMuted) {
              audioRef.current.play().catch(() => { });
            }
            window.removeEventListener('click', unlockAudio);
          };
          window.addEventListener('click', unlockAudio);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isGlobalMuted, isMusicPlaying, currentTrackIndex]);

  const handleNextTrack = () => { setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length); };
  const handlePrevTrack = () => { setCurrentTrackIndex((prev) => (prev - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length); };
  const handleMusicEnded = () => { handleNextTrack(); };

  const playClick = () => {
    if (isGlobalMuted) return;
    const audio = new Audio('assets/audio/click.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => { });
  };

  // --- GAME LOGIC ---
  const startTraining = () => {
    playClick();
    setIsTraining(true);
    setIsHost(true);
    setRoomId('OFFLINE');
    setGameState('MENU');
    setStatusMsg(t('STATUS_P2_CONNECTED'));
  };

  const createRoom = async () => {
    playClick();
    setIsTraining(false);
    setStatusMsg(t('STATUS_CREATING'));
    try {
      const user = await signInAnonymously(auth);
      const uid = user.user.uid;
      setIsHost(true);
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomId(code);
      const mapData = generateMapData();
      await set(ref(db, `rooms/${code}`), { host: uid, status: 'LOBBY', turn: 1, map: mapData });
      setStatusMsg(t('STATUS_CREATED').replace('{0}', code));

      const roomRef = ref(db, `rooms/${code}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.guest) {
          setStatusMsg(t('STATUS_P2_CONNECTED'));
          setGameState((prev) => (prev === 'LOBBY' ? 'MENU' : prev));
          unsubscribe();
        }
      });
    } catch (e) {
      setStatusMsg(t('STATUS_ERROR') + e.message);
    }
  };

  const joinRoom = async () => {
    playClick();
    if (joinCode.length !== 4) return;
    setIsTraining(false);
    setStatusMsg(t('STATUS_JOINING'));
    try {
      const user = await signInAnonymously(auth);
      const uid = user.user.uid;
      setIsHost(false);
      const rRef = ref(db, `rooms/${joinCode}`);
      const snap = await get(rRef);
      if (snap.exists()) {
        await update(rRef, { guest: uid });
        setRoomId(joinCode);
        setGameState('MENU');
      } else {
        setStatusMsg(t('STATUS_NOT_FOUND'));
      }
    } catch (e) {
      setStatusMsg(t('STATUS_ERROR') + e.message);
    }
  };

  const lockInSquad = async () => {
    playClick();
    if (mySquad.length !== 3) return;
    if (isTraining) { setGameState('PLAYING'); return; }

    const role = isHost ? 'hostSquad' : 'guestSquad';
    await update(ref(db, `rooms/${roomId}`), { [role]: mySquad });
    setStatusMsg(t('STATUS_WAITING'));

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setGameState((prev) => {
        const canStart = prev === 'MENU' || prev === 'LOBBY';
        if (canStart && data.hostSquad && data.guestSquad) {
          unsubscribe();
          return 'PLAYING';
        }
        return prev;
      });
    });
  };

  const handleGameOver = (result) => { setGameResult(result); setGameState('GAMEOVER'); };

  const restartGame = async () => {
    playClick();
    setRunId(prev => prev + 1);
    if (!isTraining && roomId) {
      try { await set(ref(db, `rooms/${roomId}/surrender`), null); } catch (e) { console.error(e); }
    }
    setGameState('PLAYING');
  };

  const backToMenu = () => { playClick(); setMySquad([]); setGameState('LOBBY'); window.location.reload(); };

  const getResultColor = () => {
    if (gameResult === 'VICTORY') return '#00ff00';
    if (gameResult === 'DRAW') return '#ffff00';
    return '#ff0000';
  };

  useEffect(() => {
    if (!roomId || isTraining) return;
    surrenderHandledRef.current = false;
    const surrenderRef = ref(db, `rooms/${roomId}/surrender`);
    const unsubscribe = onValue(surrenderRef, (snapshot) => {
      const whoSurrendered = snapshot.val();
      if (!whoSurrendered) return;
      if (surrenderHandledRef.current) return;
      surrenderHandledRef.current = true;
      const myRole = isHost ? 'HOST' : 'GUEST';
      handleGameOver(whoSurrendered === myRole ? 'DEFEAT' : 'VICTORY');
    });
    return () => unsubscribe();
  }, [roomId, isTraining, isHost, runId]);

  return (
    <>
      <style>{`
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #121220; overflow: hidden; font-family: 'Segoe UI', Tahoma, sans-serif; }
        * { box-sizing: border-box; user-select: none; }
        .ship-card:hover { transform: translateY(-5px); border-color: #00ffff !important; box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important; }
        input::placeholder { color: #555; }
        .music-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #00ccff; padding: 5px 0; opacity: 0.9; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .music-btn:hover { opacity: 1; transform: scale(1.1); color: #fff; text-shadow: 0 0 8px #00ccff; }
      `}</style>

      <audio ref={audioRef} src={MUSIC_TRACKS[currentTrackIndex]} onEnded={handleMusicEnded} loop={false} />

      <div style={styles.backgroundWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={styles.gameContainer}>
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 9999, display: 'flex', gap: 5, background: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 5, border: '1px solid #333' }}>
              <button onClick={() => setLang('PT')} style={{ color: lang === 'PT' ? '#00ff00' : '#888', fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>PT</button>
              <div style={{ width: 1, background: '#555' }}></div>
              <button onClick={() => setLang('EN')} style={{ color: lang === 'EN' ? '#00ff00' : '#888', fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>EN</button>
            </div>

            {gameState === 'LOBBY' && (
              <div style={styles.menuBox}>
                <div style={styles.menuContent}>
                  <h1 style={styles.title}>{t('MAIN_TITLE')}</h1>
                  <p style={{ color: '#00ccff', marginBottom: 30, fontSize: '1.2rem', textShadow: '0 0 10px #00ccff' }}>{t('MAIN_SUBTITLE')}</p>
                  <button style={{ ...styles.btn, background: '#444', width: '100%', marginBottom: 30, border: '1px solid #666' }} onClick={startTraining}>{t('BTN_TRAINING')}</button>
                  <div style={{ display: 'flex', gap: 40 }}>
                    <div style={styles.lobbyBox}>
                      <h3 style={{ color: '#fff' }}>{t('HOST_TITLE')}</h3>
                      <button style={styles.btn} onClick={createRoom}>{t('HOST_BTN')}</button>
                    </div>
                    <div style={styles.lobbyBox}>
                      <h3 style={{ color: '#fff' }}>{t('GUEST_TITLE')}</h3>
                      <input type="text" maxLength={4} style={styles.input} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder={t('INPUT_PLACEHOLDER')} />
                      <button style={styles.btn} onClick={joinRoom}>{t('GUEST_BTN')}</button>
                    </div>
                  </div>
                  <p style={{ marginTop: 20, color: '#ffaa00', fontSize: 14, fontWeight: 'bold' }}>{statusMsg}</p>
                </div>
              </div>
            )}

            {gameState === 'MENU' && (
              <div style={styles.menuBox}>
                <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: 8, border: '1px solid #00ccff' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>{t('ROOM_LABEL')}</span> <span style={{ color: '#00ccff', fontSize: 20, fontWeight: 'bold' }}>{roomId}</span>
                </div>
                <div style={styles.menuContent}>
                  <div style={styles.instructionsBox}><p style={{ margin: 0, color: '#00ccff', fontWeight: 'bold' }}>{t('SELECT_INSTRUCT')}</p></div>
                  <div style={styles.cardRow}>
                    {Object.values(SHIP_STATS).map(ship => (
                      <div key={ship.id} className="ship-card" style={styles.card} onClick={() => { playClick(); if (mySquad.length < 3) setMySquad([...mySquad, ship.id]); }}>
                        <img src={SHIP_IMAGES[ship.sprite]} alt={ship.name} style={styles.cardImage} />
                        <strong style={{ fontSize: '1rem', color: '#fff', display: 'block' }}>{ship.name}</strong>
                        <div style={styles.statLine}>HP: {ship.hp} | SPD: {ship.speed}</div>
                        <div style={{ fontSize: '10px', color: '#888', marginTop: 5 }}>{t(ship.descKey)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={styles.slotsContainer}>
                    {mySquad.map((id, idx) => (
                      <div key={idx} style={styles.slotActive} onClick={() => { playClick(); const ns = [...mySquad]; ns.splice(idx, 1); setMySquad(ns); }}>{SHIP_STATS[id].name} ✖</div>
                    ))}
                  </div>
                  <button disabled={mySquad.length !== 3} style={{ ...styles.startBtn, opacity: mySquad.length === 3 ? 1 : 0.5 }} onClick={lockInSquad}>{t('BTN_READY')}</button>
                  <p style={{ marginTop: 10, color: '#ffaa00' }}>{statusMsg}</p>
                </div>
              </div>
            )}

            {gameState === 'PLAYING' && (
              <>
                <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
                  <button
                    style={{ background: 'rgba(255, 0, 0, 0.2)', border: '1px solid #ff0000', color: '#ff0000', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}
                    onClick={async () => {
                      if (!window.confirm(t('SURRENDER_CONFIRM'))) return;
                      if (isTraining) { handleGameOver("DEFEAT"); return; }
                      try { await set(ref(db, `rooms/${roomId}/surrender`), isHost ? 'HOST' : 'GUEST'); }
                      catch (err) { alert("Erro: " + err.message); }
                    }}
                  >
                    {t('BTN_SURRENDER')}
                  </button>
                </div>

                <PhaserGame
                  key={`${runId}-${roomId}-${isTraining ? 'T' : 'M'}-${lang}`}
                  roomId={roomId}
                  isHost={isHost}
                  isTraining={isTraining}
                  mySquadList={mySquad}
                  onGameOver={handleGameOver}
                  onExit={backToMenu}
                  lang={lang}
                  t={t}
                  isGlobalMuted={isGlobalMuted}
                />
              </>
            )}

            {gameState === 'GAMEOVER' && (
              <div style={styles.overlay}>
                <h1 style={{ ...styles.title, color: getResultColor() }}>{t(gameResult)}</h1>
                <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
                  <button style={styles.btn} onClick={restartGame}>{t('BTN_RESTART')}</button>
                  <button style={{ ...styles.btn, background: '#444' }} onClick={backToMenu}>{t('BTN_MENU')}</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: '#0a141e', padding: '15px 8px', borderRadius: '30px', border: '2px solid #00ccff', boxShadow: '0 0 15px rgba(0, 204, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.5)', zIndex: 9999 }}>
            {!isGlobalMuted && (
              <>
                <button className="music-btn" onClick={handlePrevTrack} title="Anterior"><span>🔼</span></button>
                <button className="music-btn" onClick={() => setIsMusicPlaying(!isMusicPlaying)} title="Play/Pause"><span style={{ fontSize: '22px' }}>{isMusicPlaying ? '⏸' : '▶'}</span></button>
                <button className="music-btn" onClick={handleNextTrack} title="Próxima"><span>🔽</span></button>
                <div style={{ width: '80%', height: 1, background: '#00ccff', margin: '5px 0', opacity: 0.3 }}></div>
              </>
            )}
            <button className="music-btn" onClick={() => setIsGlobalMuted(!isGlobalMuted)} title="Master Mute" style={{ color: isGlobalMuted ? '#ff4444' : '#00ff00' }}><span style={{ fontSize: '22px' }}>{isGlobalMuted ? '🔇' : '🔊'}</span></button>
          </div>
        </div>
      </div>
    </>
  );
}
// --- PHASER GAME COMPONENT ---
const PhaserGame = ({ roomId, isHost, isTraining, mySquadList, onGameOver, onExit, lang, t, isGlobalMuted }) => {
  const gameRef = useRef(null);
  const turnRefValue = useRef(1);

  useEffect(() => {
    if (gameRef.current) gameRef.current.sound.mute = isGlobalMuted;
  }, [isGlobalMuted]);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO, width: TOTAL_WIDTH, height: TOTAL_HEIGHT, backgroundColor: '#000000',
      parent: 'phaser-container', disableVisibilityChange: true,
      physics: { default: 'arcade', arcade: { debug: true, gravity: { y: 0 }, fps: 60, fixedStep: true } }, // DEBUG ON!
      scale: { mode: Phaser.Scale.NONE },
      scene: { preload, create, update }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    game.sound.mute = isGlobalMuted;

    let playerSquad = [], enemySquad = [], shipsGroup, obstacleGroup, projectileGroup;
    let selectedShip = null, moveHandle = null, attackHandle = null, graphics;
    let turnText, txtName, txtHP, txtSPD, txtDMG, timerText;
    let isExecuting = false, isWaiting = false, matchEnded = false;
    let unsubscribeTurns = null, unsubscribeSurrender = null, timerEvent = null, timeLeft = TURN_TIME_LIMIT;
    let sfxShoot, sfxExplosion, sfxClick, sfxCrash;

    function preload() {
      this.load.image('bg', 'assets/background.png');
      this.load.image('flux_img', 'assets/Flux.png');
      this.load.image('vector_img', 'assets/Vector.png');
      this.load.image('colossus_img', 'assets/Colossus.png');
      this.load.image('asteroid_img', 'assets/Asteroid.png');
      this.load.audio('shoot', 'assets/audio/shoot.mp3');
      this.load.audio('explosion', 'assets/audio/explosion.mp3');
      this.load.audio('click', 'assets/audio/click.mp3');
      this.load.audio('crash', 'assets/audio/crash.mp3');
    }

    async function create() {
      const scene = this;
      scene.input.mouse.disableContextMenu();
      scene.add.tileSprite(TOTAL_WIDTH/2, PLAY_HEIGHT/2, TOTAL_WIDTH, PLAY_HEIGHT, 'bg').setAlpha(1);

      try {
        sfxShoot = scene.sound.add('shoot', { volume: 0.3 });
        sfxExplosion = scene.sound.add('explosion', { volume: 0.5 });
        sfxClick = scene.sound.add('click', { volume: 0.5 });
        sfxCrash = scene.sound.add('crash', { volume: 0.6 });
      } catch (e) {}

      const hudY = PLAY_HEIGHT;
      const hudBg = scene.add.graphics();
      hudBg.fillStyle(0x151515, 1); hudBg.fillRect(0, hudY, TOTAL_WIDTH, HUD_HEIGHT);
      hudBg.lineStyle(2, 0x0088ff, 0.5); hudBg.lineBetween(0, hudY, TOTAL_WIDTH, hudY);

      const textX = 20, startY = PLAY_HEIGHT + 15, lineHeight = 22;
      turnText = scene.add.text(textX, startY, t('TURN_YOURS'), { font: 'bold 20px Arial', fill: '#00ff00' }).setDepth(100);
      txtName = scene.add.text(textX, startY + 30, t('SELECT_SHIP'), { font: 'bold 18px Arial', fill: '#ffffff' }).setDepth(100);
      txtHP = scene.add.text(textX, startY + 30 + lineHeight, "", { font: '14px monospace', fill: '#00ff00' }).setDepth(100);
      txtSPD = scene.add.text(textX, startY + 30 + (lineHeight*2), "", { font: '14px monospace', fill: '#00ccff' }).setDepth(100);
      txtDMG = scene.add.text(textX, startY + 30 + (lineHeight*3), "", { font: '14px monospace', fill: '#ff4400' }).setDepth(100);
      timerText = scene.add.text(20, 60, `${t('TIMER_LABEL')}${TURN_TIME_LIMIT}`, { font: 'bold 20px monospace', fill: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0,0).setDepth(100);

      scene.physics.world.setBounds(0, 0, TOTAL_WIDTH, PLAY_HEIGHT);
      graphics = scene.add.graphics();
      shipsGroup = scene.physics.add.group();
      obstacleGroup = scene.physics.add.staticGroup();
      projectileGroup = scene.physics.add.group();

      let mapData = [];
      if (isTraining) mapData = generateMapData();
      else {
        try { const snap = await get(ref(db, `rooms/${roomId}`)); mapData = snap.val()?.map || generateMapData(); } catch (e) { mapData = generateMapData(); }
      }

      mapData.forEach(pos => {
        const obs = obstacleGroup.create(pos.x, pos.y, 'asteroid_img');
        obs.setScale(0.12);
        const radius = obs.displayWidth * 0.18;
        obs.body.setCircle(radius);
        obs.body.setOffset((obs.displayWidth/2)-radius, (obs.displayHeight/2)-radius);
        obs.refreshBody();
      });

      let mySquadData, enemySquadData;
      if (isTraining) { mySquadData = mySquadList; enemySquadData = ['FLUX', 'VECTOR', 'COLOSSUS']; }
      else {
        const snap = await get(ref(db, `rooms/${roomId}`));
        const d = snap.val();
        mySquadData = isHost ? d.hostSquad : d.guestSquad;
        enemySquadData = isHost ? d.guestSquad : d.hostSquad;
      }

      const myOwner = isTraining ? 'HOST' : (isHost ? 'HOST' : 'GUEST');
      const enemyOwner = isTraining ? 'GUEST' : (isHost ? 'GUEST' : 'HOST');

      mySquadData.forEach((id, i) => spawnShip(scene, 262+(i*250), (isHost?60:PLAY_HEIGHT-60), SHIP_STATS[id], 'PLAYER', i, myOwner));
      enemySquadData.forEach((id, i) => spawnShip(scene, 262+(i*250), (isHost?PLAY_HEIGHT-60:60), SHIP_STATS[id], 'ENEMY', i, enemyOwner));

      if (!isTraining) {
        unsubscribeTurns = onValue(ref(db, `rooms/${roomId}/turns`), (snap) => {
          if (matchEnded) return;
          const turns = snap.val();
          if (turns?.[turnRefValue.current]?.host && turns?.[turnRefValue.current]?.guest && !isExecuting) {
            runTurnResolution(scene, turns[turnRefValue.current]);
          }
        });
        unsubscribeSurrender = onValue(ref(db, `rooms/${roomId}/surrender`), (snap) => {
          if (snap.val()) { matchEnded = true; scene.input.enabled = false; }
        });
      }

      // Visual placebo
      scene.physics.add.overlap(projectileGroup, shipsGroup, (p, s) => {
        if (!p.active || !s.active || p.ownerNetOwner === s.netOwner) return;
        const boom = scene.add.circle(p.x, p.y, 15, 0xffaa00);
        scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 150, onComplete: () => boom.destroy() });
        p.destroy();
        takeDamagePredicted(scene, s, p.damage);
      });

      scene.physics.add.collider(projectileGroup, obstacleGroup, (p) => {
        const boom = scene.add.circle(p.x, p.y, 10, 0xaaaaaa);
        scene.tweens.add({ targets: boom, scale: 1.5, alpha: 0, duration: 100, onComplete: () => boom.destroy() });
        p.destroy();
      });

      scene.physics.add.overlap(shipsGroup, shipsGroup, (a, b) => {
        if (!isExecuting || a.hasCrashed || b.hasCrashed) return;
        scene.cameras.main.shake(100, 0.01);
        if (sfxCrash) sfxCrash.play();
        a.hasCrashed = true; b.hasCrashed = true;
        showFloatText(scene, (a.x+b.x)/2, (a.y+b.y)/2, t('CRASH_LABEL'), '#ffaa00');
        takeDamagePredicted(scene, a, 20); takeDamagePredicted(scene, b, 20);
      });

      // HUD Button & Handles
      const container = scene.add.container(0, 0).setDepth(200);
      const btnEx = scene.add.container(TOTAL_WIDTH - 120, PLAY_HEIGHT + (HUD_HEIGHT/2));
      const bgEx = scene.add.rectangle(0,0,160,60,0x008800).setInteractive().on('pointerdown', () => {
        if (!isExecuting) { if(sfxClick) sfxClick.play(); submitTurn(scene); }
      });
      btnEx.add([bgEx, scene.add.text(0,0, t('BTN_EXECUTE'), {fontSize:'13px', fontStyle:'bold'}).setOrigin(0.5)]);
      container.add(btnEx);

      moveHandle = scene.add.circle(0,0,10,0x00ff00).setStrokeStyle(3,0x000).setDepth(300).setVisible(false).setInteractive({draggable:true});
      attackHandle = scene.add.circle(0,0,10,0xff0000).setStrokeStyle(3,0x000).setDepth(300).setVisible(false).setInteractive({draggable:true});

      moveHandle.on('drag', (p, x, y) => {
        if (selectedShip && !isExecuting && !isWaiting) {
          const c = clampPoint(x, y); moveHandle.setPosition(c.x, c.y);
          if (Phaser.Math.Distance.Between(selectedShip.x, selectedShip.y, c.x, c.y) <= selectedShip.stats.moveRange && checkRaycast(selectedShip.x, selectedShip.y, c.x, c.y)) {
            selectedShip.plannedMove = { x: c.x, y: c.y }; moveHandle.setFillStyle(0x00ff00);
          } else moveHandle.setFillStyle(0x555555);
        }
      });
      attackHandle.on('drag', (p, x, y) => {
        if (selectedShip && !isExecuting && !isWaiting) {
          const c = clampPoint(x, y); attackHandle.setPosition(c.x, c.y);
          selectedShip.plannedAttack = { x: c.x, y: c.y };
        }
      });

      setupInputs(scene);
      startTimer(scene);
    }

    // ✅ SPAWN COM CORREÇÃO DE OFFSET PARA O INIMIGO
    function spawnShip(scene, x, y, stats, faction, index, netOwner) {
      const ship = scene.physics.add.sprite(x, y, stats.sprite);
      ship.setScale(0.17);
      
      const r = stats.hitRadius ?? 16;
      ship.body.setCircle(r);

      const manualX = stats.hitOffset?.x ?? 0;
      const manualY = stats.hitOffset?.y ?? 0;

      if (faction === 'ENEMY') {
        ship.angle = 180;
        // Inverte o offset X para que a bola roxa acompanhe a rotação 180
        if (manualX > 0) {
             const diameter = r * 2;
             // Cálculo: Largura da textura - OffsetOriginal - Diâmetro
             const flippedX = ship.width - manualX - diameter;
             ship.body.setOffset(flippedX, manualY); 
        } else {
             ship.body.setOffset((ship.width/2)-r, (ship.height/2)-r);
        }
      } else {
        if (manualX > 0) ship.body.setOffset(manualX, manualY);
        else ship.body.setOffset((ship.width/2)-r, (ship.height/2)-r);
      }

      ship.stats = stats; ship.hp = stats.hp; ship.faction = faction;
      ship.squadIndex = index; ship.netOwner = netOwner; ship.netId = `${netOwner}_${index}`;
      ship.weapon = WEAPONS.CANNON; ship.hasCrashed = false;
      shipsGroup.add(ship);
      if (faction === 'PLAYER') playerSquad.push(ship); else enemySquad.push(ship);
      return ship;
    }

    function distancePointToLineSegment(px, py, x1, y1, x2, y2) {
      const l2 = Phaser.Math.Distance.Squared(x1, y1, x2, y2);
      if (l2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
      let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Phaser.Math.Distance.Between(px, py, x1+t*(x2-x1), y1+t*(y2-y1));
    }

    // ✅ MATH DO SERVIDOR: Usa o centro da bola roxa
    function computeHostTurnResult(scene, myData, enemyData) {
      const events = [];
      const allShips = [...playerSquad, ...enemySquad];
      const pos = {};
      allShips.forEach(s => pos[s.netId] = { x: s.x, y: s.y, active: !!s.active, hp: s.hp });

      const applyDmg = (id, dmg, x, y) => {
        if (!pos[id]?.active) return;
        pos[id].hp -= dmg;
        events.push({ type: 'DMG', target: id, dmg, x, y });
        if (pos[id].hp <= 0) { pos[id].active = false; events.push({ type: 'KILL', target: id, x, y }); }
      };

      const process = (ship, plan) => {
        if (!ship.active || !plan || !plan.attack) return;
        const w = WEAPONS[plan.attack.weapon || 'CANNON'];
        const ang = Phaser.Math.Angle.Between(ship.x, ship.y, plan.attack.x, plan.attack.y);
        const offsets = (w.type === 'SPREAD') ? [0, -0.2, 0.2] : [0];

        offsets.forEach(off => {
          const a = ang + off;
          const dx = Math.cos(a); const dy = Math.sin(a);
          const startX = ship.x + dx*45; const startY = ship.y + dy*45;
          const endX = startX + dx*1500; const endY = startY + dy*1500;

          const targets = (ship.netOwner === (isTraining ? 'HOST' : (isHost?'HOST':'GUEST'))) ? enemySquad : playerSquad;
          let best = null;

          targets.forEach(tgt => {
            if (!tgt.active) return;
            // Usa o centro da bola roxa (que agora está corrigida no spawnShip)
            const dist = distancePointToLineSegment(tgt.body.center.x, tgt.body.center.y, startX, startY, endX, endY);
            if (dist <= tgt.body.radius) {
               const dShooter = Phaser.Math.Distance.Between(startX, startY, tgt.body.center.x, tgt.body.center.y);
               if (!best || dShooter < best.d) best = { d: dShooter, t: tgt, x: tgt.body.center.x, y: tgt.body.center.y };
            }
          });

          obstacleGroup.getChildren().forEach(obs => {
             const dist = distancePointToLineSegment(obs.body.center.x, obs.body.center.y, startX, startY, endX, endY);
             if (dist <= obs.body.radius) {
                const dShooter = Phaser.Math.Distance.Between(startX, startY, obs.x, obs.y);
                if (!best || dShooter < best.d) best = { d: dShooter, type: 'OBSTACLE', x: obs.x, y: obs.y };
             }
          });

          if (best && best.type !== 'OBSTACLE') {
             applyDmg(best.t.netId, w.damage, best.x, best.y);
             events.push({ type: 'HITFX', x: best.x, y: best.y });
          } else if (best && best.type === 'OBSTACLE') {
             events.push({ type: 'HITFX', x: best.x, y: best.y });
          }
        });
      };

      playerSquad.forEach(s => process(s, myData.find(m => m.index === s.squadIndex)));
      enemySquad.forEach(s => process(s, enemyData.find(e => e.index === s.squadIndex)));

      // Crash logic simplificada
      playerSquad.forEach(a => {
         if(!a.active) return;
         enemySquad.forEach(b => {
            if(!b.active) return;
            // Usa posições planejadas se existirem
            const pa = (a.netOwner === (isTraining ? 'HOST' : (isHost?'HOST':'GUEST'))) ? myData.find(p=>p.index===a.squadIndex)?.move || {x:a.x,y:a.y} : enemyData.find(p=>p.index===b.squadIndex)?.move || {x:b.x,y:b.y};
            const pb = (b.netOwner === (isTraining ? 'HOST' : (isHost?'HOST':'GUEST'))) ? myData.find(p=>p.index===b.squadIndex)?.move || {x:b.x,y:b.y} : enemyData.find(p=>p.index===b.squadIndex)?.move || {x:b.x,y:b.y};
            
            const dist = Phaser.Math.Distance.Between(pa.x, pa.y, pb.x, pb.y);
            // Detecta crash se as naves terminarem o turno muito perto
            if (dist <= (a.body.radius + b.body.radius)) {
               const mx = (pa.x + pb.x)/2; const my = (pa.y + pb.y)/2;
               applyDmg(a.netId, 20, mx, my); applyDmg(b.netId, 20, mx, my);
               events.push({ type: 'CRASHFX', x: mx, y: my });
            }
         });
      });

      const finalHp = {}; allShips.forEach(s => finalHp[s.netId] = pos[s.netId].hp);
      return { hpState: finalHp, events, at: Date.now() };
    }

    function startTimer(scene) {
      if (timerEvent) timerEvent.remove();
      const endTime = Date.now() + (TURN_TIME_LIMIT * 1000);
      timeLeft = TURN_TIME_LIMIT;
      timerText.setText(`${t('TIMER_LABEL')}${timeLeft}`);
      timerText.setColor('#ffffff');
      timerEvent = scene.time.addEvent({ delay: 200, callback: () => {
        if (isExecuting || isWaiting || matchEnded) return;
        const now = Date.now();
        const sec = Math.ceil((endTime - now) / 1000);
        if (sec !== timeLeft) { timeLeft = sec; if(timeLeft<0) timeLeft=0; timerText.setText(`${t('TIMER_LABEL')}${timeLeft}`); if(timeLeft<=0) submitTurn(scene); }
      }, loop: true });
    }
    function stopTimer() { if (timerEvent) timerEvent.remove(); timerText.setText(t('WAITING_LABEL')); timerText.setColor('#ffff00'); }

    async function submitTurn(scene) {
      if (matchEnded || isWaiting || isExecuting) return;
      stopTimer();
      if (!isTraining) {
         const sSnap = await get(ref(db, `rooms/${roomId}/surrender`));
         if (sSnap.val()) return;
      }
      const myMoves = playerSquad.map(s => ({ index: s.squadIndex, move: s.plannedMove, attack: s.plannedAttack }));
      if (isTraining) {
         const aiMoves = enemySquad.map(e => {
            if(!e.active) return {index:e.squadIndex};
            const t = playerSquad.find(p=>p.active);
            let atk = null, mv = null;
            if(t) atk = {x:t.x, y:t.y, weapon: 'CANNON'};
            if(Math.random()>0.5) mv = {x: Phaser.Math.Clamp(e.x+(Math.random()-0.5)*100, 50, 900), y: Phaser.Math.Clamp(e.y+(Math.random()-0.5)*100, 50, 700)};
            return {index:e.squadIndex, move:mv, attack:atk};
         });
         runTurnResolution(scene, {host: myMoves, guest: aiMoves});
      } else {
         isWaiting = true; turnText.setText(t('STATUS_WAITING'));
         if(selectedShip) deselectAll();
         const role = isHost ? 'host' : 'guest';
         await set(ref(db, `rooms/${roomId}/turns/${turnRefValue.current}/${role}`), myMoves);
      }
    }

    async function runTurnResolution(scene, turnData) {
      if(matchEnded) return;
      isExecuting = true; isWaiting = true; turnText.setText(t('EXECUTING_LABEL')); stopTimer();
      if(selectedShip) deselectAll();
      
      const myData = isHost ? turnData.host : turnData.guest;
      const enemyData = isHost ? turnData.guest : turnData.host;

      [...playerSquad, ...enemySquad].forEach(s => {
         const p = s.faction==='PLAYER' ? myData?.find(m=>m.index===s.squadIndex) : enemyData?.find(e=>e.index===s.squadIndex);
         if(p?.move && s.active) scene.tweens.add({targets:s, x:p.move.x, y:p.move.y, duration:1000});
         if(p?.attack && s.active) fireWeapon(scene, s, p.attack.x, p.attack.y);
      });

      let result = null;
      if (!isTraining && isHost) {
         result = computeHostTurnResult(scene, myData, enemyData);
         await set(ref(db, `rooms/${roomId}/turnResults/${turnRefValue.current}`), result);
      }
      
      await new Promise(r => setTimeout(r, 2000));

      if (!isTraining) {
         if (!isHost) { const snap = await get(ref(db, `rooms/${roomId}/turnResults/${turnRefValue.current}`)); result = snap.val(); }
         applyHpState(result?.hpState);
      }

      [...playerSquad, ...enemySquad].forEach(s => { s.plannedMove=null; s.plannedAttack=null; s.body.setVelocity(0); });
      isExecuting = false; isWaiting = false; turnRefValue.current++;
      turnText.setText(t('TURN_YOURS'));
      checkWinCondition(); startTimer(scene);
    }

    function checkWinCondition() {
        const pAlive = playerSquad.some(s=>s.active);
        const eAlive = enemySquad.some(s=>s.active);
        if(!pAlive && !eAlive) onGameOver('DRAW');
        else if(!pAlive) onGameOver('DEFEAT');
        else if(!eAlive) onGameOver('VICTORY');
    }

    function clampPoint(x, y) { return { x: Phaser.Math.Clamp(x, 25, TOTAL_WIDTH-25), y: Phaser.Math.Clamp(y, 25, PLAY_HEIGHT-25) }; }
    function checkRaycast(x1,y1,x2,y2) { return true; } 
    function clearPredictions() { [...playerSquad, ...enemySquad].forEach(s => s.predictedHp = null); }
    function applyHpState(hp) {
       if(!hp) return;
       [...playerSquad, ...enemySquad].forEach(s => {
          if(hp[s.netId] !== undefined) {
             s.hp = hp[s.netId];
             if(s.hp<=0) { s.active=false; s.setVisible(false); s.body.enable=false; }
          }
       });
    }

    function setupInputs(scene) {
      scene.input.on('pointerdown', (p) => {
        if (matchEnded || isExecuting || isWaiting || p.y > PLAY_HEIGHT) return;
        const objs = scene.input.hitTestPointer(p).filter(o => o===moveHandle || o===attackHandle);
        if(objs.length>0) return;

        let clicked = null;
        playerSquad.forEach(s => { if(Phaser.Math.Distance.Between(p.x,p.y,s.x,s.y) < 60) clicked = s; });
        
        if (clicked) {
           if(clicked===selectedShip) { deselectAll(); return; }
           if(selectedShip) selectedShip.isSelected=false;
           clicked.isSelected=true; selectedShip=clicked;
           updateHandles(); drawUI(scene); updateHUDInfo();
           return;
        }

        if (selectedShip && selectedShip.active) {
           const c = clampPoint(p.x, p.y);
           if (p.rightButtonDown()) { selectedShip.plannedAttack={x:c.x, y:c.y}; updateHandles(); drawUI(scene); }
           else { selectedShip.plannedMove={x:c.x, y:c.y}; updateHandles(); drawUI(scene); }
        }
      });
      scene.input.keyboard.on('keydown-SPACE', () => { if(!isExecuting) submitTurn(scene); });
    }

    function update() {
      graphics.clear();
      [...playerSquad, ...enemySquad].forEach(s => {
         if(!s.active) return;
         drawHP(s);
         // DEBUG ROXO: Se a bola roxa estiver em cima da nave inimiga, o código funcionou.
         if (scene.physics.config?.debug) {
             graphics.lineStyle(2, 0xaa00ff, 0.8);
             graphics.strokeCircle(s.body.center.x, s.body.center.y, s.body.radius);
         }
         if(s.isSelected) {
            graphics.lineStyle(2, 0x00ff00); graphics.strokeCircle(s.body.center.x, s.body.center.y, s.body.radius);
            graphics.lineStyle(1, 0x00ff00, 0.2); graphics.strokeCircle(s.body.center.x, s.body.center.y, s.stats.moveRange);
         }
         if(s.plannedMove) { graphics.lineStyle(2,0x00ff00,0.8); graphics.lineBetween(s.x,s.y,s.plannedMove.x,s.plannedMove.y); }
         if(s.plannedAttack) { graphics.lineStyle(2,0xff0000,0.8); graphics.lineBetween(s.x,s.y,s.plannedAttack.x,s.plannedAttack.y); }
      });
    }

    function drawHP(s) {
       graphics.fillStyle(0x000); graphics.fillRect(s.x-20, s.y-45, 40, 6);
       graphics.fillStyle(s.faction==='PLAYER'?0x00ff00:0xff0000);
       graphics.fillRect(s.x-20, s.y-45, 40*(s.hp/s.stats.hp), 6);
    }
    
    function deselectAll() { if(selectedShip) selectedShip.isSelected=false; selectedShip=null; moveHandle.setVisible(false); attackHandle.setVisible(false); }
    function updateHandles() {
       if(!selectedShip) return;
       if(selectedShip.plannedMove) { moveHandle.setPosition(selectedShip.plannedMove.x, selectedShip.plannedMove.y); moveHandle.setVisible(true); } else moveHandle.setVisible(false);
       if(selectedShip.plannedAttack) { attackHandle.setPosition(selectedShip.plannedAttack.x, selectedShip.plannedAttack.y); attackHandle.setVisible(true); } else attackHandle.setVisible(false);
    }
    // Simplificado para brevidade, adicione se tiver botoes de UI extra
    function drawUI(scene) {} 

    return () => { if(gameRef.current) gameRef.current.destroy(true); };
  }, [roomId, isHost, isTraining, lang]);

  return <div id="phaser-container" />;
};

const styles = {
  backgroundWrapper: { width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  gameContainer: { width: '1024px', height: '768px', position: 'relative', background: '#111', overflow: 'hidden' },
  menuBox: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  title: { fontSize: '3rem', color: '#00ccff' },
  btn: { padding: '15px 30px', margin: '10px', fontSize: '1.2rem', cursor: 'pointer', background: '#0077ff', color: '#fff', border: 'none', borderRadius: '5px' },
  lobbyBox: { padding: '20px', background: '#222', borderRadius: '10px' },
  input: { padding: '10px', fontSize: '1.5rem', textAlign: 'center', margin: '10px' },
  cardRow: { display: 'flex', gap: '20px' },
  card: { padding: '10px', background: '#333', cursor: 'pointer', border: '1px solid #555' },
  overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  slotActive: { padding: '10px', background: '#004400', color: '#fff', border: '1px solid #0f0', marginTop: 5, cursor: 'pointer' },
  startBtn: { padding: '20px 60px', fontSize: '1.5rem', background: '#00ff00', border: 'none', cursor: 'pointer', marginTop: 20 }
};