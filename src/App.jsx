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

// --- DADOS DAS NAVES ---
const SHIP_STATS = {
  FLUX: { id: 'FLUX', name: 'FLUX', descKey: 'DESC_FLUX', hp: 90, speed: 155, color: 0x00ffff, radius: 24, moveRange: 385, sprite: 'flux_img', hitRadius: 150, hitOffset: { x: 170, y: 200 } },
  VECTOR: { id: 'VECTOR', name: 'VECTOR', descKey: 'DESC_VECTOR', hp: 120, speed: 110, color: 0x00ff00, radius: 28, moveRange: 310, sprite: 'vector_img', hitRadius: 150, hitOffset: { x: 140, y: 180 } },
  COLOSSUS: { id: 'COLOSSUS', name: 'COLOSSUS', descKey: 'DESC_COLOSSUS', hp: 180, speed: 75, color: 0xffaa00, radius: 38, moveRange: 220, sprite: 'colossus_img', hitRadius: 155, hitOffset: { x: 150, y: 180 } }
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

  // 🔥 AUTOPLAY LÓGICA
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

  // SFX Click Global
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
  const getResultColor = () => { if (gameResult === 'VICTORY') return '#00ff00'; if (gameResult === 'DRAW') return '#ffff00'; return '#ff0000'; };

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

      <audio
        ref={audioRef}
        src={MUSIC_TRACKS[currentTrackIndex]}
        onEnded={handleMusicEnded}
        loop={false}
      />

      <div style={styles.backgroundWrapper}>
        {/* 🔥 WRAPPER HORIZONTAL (JOGO + PLAYER LATERAL) */}
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
                  roomId={roomId} isHost={isHost} isTraining={isTraining} mySquadList={mySquad}
                  onGameOver={handleGameOver} onExit={backToMenu} lang={lang} t={t}
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

          {/* 🎧 DOCK MULTIMÍDIA V43 (Vertical Lateral Fora do Jogo) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            background: '#0a141e',
            padding: '15px 8px',
            borderRadius: '30px',
            border: '2px solid #00ccff',
            boxShadow: '0 0 15px rgba(0, 204, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.5)',
            zIndex: 9999
          }}>
            {!isGlobalMuted && (
              <>
                <button className="music-btn" onClick={handlePrevTrack} title="Anterior">
                  <span>🔼</span>
                </button>
                <button className="music-btn" onClick={() => setIsMusicPlaying(!isMusicPlaying)} title="Play/Pause">
                  <span style={{ fontSize: '22px' }}>{isMusicPlaying ? '⏸' : '▶'}</span>
                </button>
                <button className="music-btn" onClick={handleNextTrack} title="Próxima">
                  <span>🔽</span>
                </button>
                <div style={{ width: '80%', height: 1, background: '#00ccff', margin: '5px 0', opacity: 0.3 }}></div>
              </>
            )}
            <button
              className="music-btn"
              onClick={() => setIsGlobalMuted(!isGlobalMuted)}
              title="Master Mute"
              style={{ color: isGlobalMuted ? '#ff4444' : '#00ff00' }}
            >
              <span style={{ fontSize: '22px' }}>{isGlobalMuted ? '🔇' : '🔊'}</span>
            </button>
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
    if (gameRef.current) {
      gameRef.current.sound.mute = isGlobalMuted;
    }
  }, [isGlobalMuted]);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      backgroundColor: '#000000',
      parent: 'phaser-container',
      disableVisibilityChange: true,
      physics: { default: 'arcade', arcade: { debug: true, gravity: { y: 0 }, fps: 60, fixedStep: true } },
      scale: { mode: Phaser.Scale.NONE },
      scene: { preload, create, update }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    game.sound.mute = isGlobalMuted;

    let playerSquad = [], enemySquad = [];
    let selectedShip = null, moveHandle = null, attackHandle = null;
    let graphics, uiGroup, staticHudGroup, turnText, txtName, txtHP, txtSPD, txtDMG, timerText;
    let isExecuting = false, isWaiting = false;
    let shipsGroup, obstacleGroup, projectileGroup;
    let unsubscribeTurns = null;
    let matchEnded = false;
    let unsubscribeSurrender = null;
    let timeLeft = TURN_TIME_LIMIT, timerEvent = null;

    let sfxShoot, sfxExplosion, sfxClick, sfxCrash;

    function preload() {
      this.load.image('bg', 'assets/background.png');
      this.load.image('flux_img', 'assets/Flux.png');
      this.load.image('vector_img', 'assets/Vector.png');
      this.load.image('colossus_img', 'assets/Colossus.png');
      this.load.image('asteroid_img', 'assets/Asteroid.png');

      // 🔊 SFX DO PHASER
      this.load.audio('shoot', 'assets/audio/shoot.mp3');
      this.load.audio('explosion', 'assets/audio/explosion.mp3');
      this.load.audio('click', 'assets/audio/click.mp3');
      this.load.audio('crash', 'assets/audio/crash.mp3');
    }

    async function create() {
      const scene = this;
      scene.input.mouse.disableContextMenu();
      scene.add.tileSprite(TOTAL_WIDTH / 2, PLAY_HEIGHT / 2, TOTAL_WIDTH, PLAY_HEIGHT, 'bg').setAlpha(1);

      try {
        sfxShoot = scene.sound.add('shoot', { volume: 0.3 });
        sfxExplosion = scene.sound.add('explosion', { volume: 0.5 });
        sfxClick = scene.sound.add('click', { volume: 0.5 });
        sfxCrash = scene.sound.add('crash', { volume: 0.6 });
      } catch (e) { console.log("Erro de áudio Phaser", e); }

      const hudY = PLAY_HEIGHT;
      const hudBg = scene.add.graphics();
      hudBg.fillStyle(0x151515, 1);
      hudBg.fillRect(0, hudY, TOTAL_WIDTH, HUD_HEIGHT);
      hudBg.lineStyle(2, 0x0088ff, 0.5);
      hudBg.lineBetween(0, hudY, TOTAL_WIDTH, hudY);

      const textX = 20; const startY = PLAY_HEIGHT + 15; const lineHeight = 22;
      turnText = scene.add.text(textX, startY, t('TURN_YOURS'), { font: 'bold 20px Arial', fill: '#00ff00' }).setDepth(100);
      txtName = scene.add.text(textX, startY + 30, t('SELECT_SHIP'), { font: 'bold 18px Arial', fill: '#ffffff' }).setDepth(100);
      txtHP = scene.add.text(textX, startY + 30 + lineHeight, "", { font: '14px monospace', fill: '#00ff00' }).setDepth(100);
      txtSPD = scene.add.text(textX, startY + 30 + (lineHeight * 2), "", { font: '14px monospace', fill: '#00ccff' }).setDepth(100);
      txtDMG = scene.add.text(textX, startY + 30 + (lineHeight * 3), "", { font: '14px monospace', fill: '#ff4400' }).setDepth(100);
      timerText = scene.add.text(20, 60, `${t('TIMER_LABEL')}${TURN_TIME_LIMIT}`, { font: 'bold 20px monospace', fill: '#ffffff', stroke: '#000', strokeThickness: 3 })
        .setOrigin(0, 0).setDepth(100);

      scene.physics.world.setBounds(0, 0, TOTAL_WIDTH, PLAY_HEIGHT);
      graphics = scene.add.graphics();
      uiGroup = scene.add.container(0, 0).setDepth(200);
      staticHudGroup = scene.add.container(0, 0).setDepth(200);
      shipsGroup = scene.physics.add.group();
      obstacleGroup = scene.physics.add.staticGroup();
      projectileGroup = scene.physics.add.group();

      let mapData = [];
      if (isTraining) mapData = generateMapData();
      else {
        try {
          const roomSnap = await get(ref(db, `rooms/${roomId}`));
          const roomData = roomSnap.val();
          if (roomData && roomData.map) mapData = roomData.map; else mapData = generateMapData();
        } catch (e) { mapData = generateMapData(); }
      }

      mapData.forEach(pos => {
        const obs = obstacleGroup.create(pos.x, pos.y, 'asteroid_img');
        obs.setScale(0.12);
        const radius = obs.width * 0.10;
        obs.body.setCircle(radius);
        const offset = (obs.width - (radius * 2)) / 2;
        obs.body.setOffset(offset, offset);
        obs.refreshBody();
      });

      let mySquadData, enemySquadData;
      if (isTraining) { mySquadData = mySquadList; enemySquadData = ['FLUX', 'VECTOR', 'COLOSSUS']; }
      else {
        const roomSnap = await get(ref(db, `rooms/${roomId}`));
        const roomData = roomSnap.val();
        mySquadData = isHost ? roomData.hostSquad : roomData.guestSquad;
        enemySquadData = isHost ? roomData.guestSquad : roomData.hostSquad;
      }

      const pY = (isHost || isTraining) ? 60 : PLAY_HEIGHT - 60;
      const eY = (isHost || isTraining) ? PLAY_HEIGHT - 60 : 60;

      // ✅ IDs ABSOLUTOS DE REDE (HOST_0..2 / GUEST_0..2)
      const myOwner = isTraining ? 'HOST' : (isHost ? 'HOST' : 'GUEST');
      const enemyOwner = isTraining ? 'GUEST' : (isHost ? 'GUEST' : 'HOST');

      mySquadData.forEach((id, i) => spawnShip(scene, 262 + (i * 250), pY, SHIP_STATS[id], 'PLAYER', i, myOwner));
      enemySquadData.forEach((id, i) => spawnShip(scene, 262 + (i * 250), eY, SHIP_STATS[id], 'ENEMY', i, enemyOwner));

      if (!isTraining) {
        const turnRef = ref(db, `rooms/${roomId}/turns`);
        unsubscribeTurns = onValue(turnRef, (snapshot) => {
          if (matchEnded) return;
          const turns = snapshot.val(); if (!turns) return;
          const currentT = turnRefValue.current;
          const turnData = turns[currentT];
          if (turnData && turnData.host && turnData.guest) {
            if (!isExecuting) runTurnResolution(scene, turnData);
          }
        });

        const surrenderRef = ref(db, `rooms/${roomId}/surrender`);
        unsubscribeSurrender = onValue(surrenderRef, (snap) => {
          const who = snap.val(); if (!who) return;
          matchEnded = true;
          try { if (timerEvent) timerEvent.remove(); } catch (e) { }
          try { scene.input.enabled = false; } catch (e) { }
          try { uiGroup.setVisible(false); } catch (e) { }
          try { staticHudGroup.setVisible(false); } catch (e) { }
        });
      }

      // ✅ PROJÉTIL x NAVE:
      // - Visual sempre
      // - Dano REAL: apenas Host (online)
      // - Guest: faz só "preview" na barra (não mata de verdade)
      scene.physics.add.overlap(projectileGroup, shipsGroup, (projectile, ship) => {
        if (!projectile.active || !ship.active) return;

        // não acerta o próprio "netOwner"
        if (projectile.ownerNetOwner === ship.netOwner) return;

        // visual sempre
        const boom = scene.add.circle(projectile.x, projectile.y, 15, 0xffaa00);
        scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 150, onComplete: () => boom.destroy() });
        projectile.destroy();

        if (isTraining) {
          takeDamage(scene, ship, projectile.damage, true);
          return;
        }

        if (isHost) {
          takeDamage(scene, ship, projectile.damage, true); // ✅ autoritativo
        } else {
          takeDamagePredicted(scene, ship, projectile.damage); // ✅ preview UI
        }
      });

      scene.physics.add.collider(projectileGroup, obstacleGroup, (projectile) => {
        const boom = scene.add.circle(projectile.x, projectile.y, 10, 0xaaaaaa);
        scene.tweens.add({ targets: boom, scale: 1.5, alpha: 0, duration: 100, onComplete: () => boom.destroy() });
        projectile.destroy();
      });

      // ✅ NAVE x NAVE:
      // - Visual sempre
      // - Dano REAL: apenas Host (online)
      // - Guest: preview UI (sem matar de verdade)
      scene.physics.add.overlap(shipsGroup, shipsGroup, (a, b) => {
        if (a === b) return;
        if (!a.active || !b.active) return;
        if (a.netOwner === b.netOwner) return;
        if (!isExecuting) return;
        if (a.hasCrashed || b.hasCrashed) return;

        // trava duplicidade (ordem consistente em ambos)
        if (String(a.netId) > String(b.netId)) return;

        scene.cameras.main.shake(100, 0.01);
        if (sfxCrash) sfxCrash.play();

        a.hasCrashed = true; b.hasCrashed = true;
        showFloatText(scene, (a.x + b.x) / 2, (a.y + b.y) / 2, t('CRASH_LABEL'), '#ffaa00');

        if (isTraining) {
          takeDamage(scene, a, 20, true);
          takeDamage(scene, b, 20, true);
          return;
        }

        if (isHost) {
          takeDamage(scene, a, 20, true);
          takeDamage(scene, b, 20, true);
        } else {
          takeDamagePredicted(scene, a, 20);
          takeDamagePredicted(scene, b, 20);
        }
      });

      const centerY = PLAY_HEIGHT + (HUD_HEIGHT / 2);
      createButton(scene, TOTAL_WIDTH - 120, centerY, t('BTN_EXECUTE'), 160, 60, 0x008800, () => {
        if (!isExecuting) {
          if (sfxClick) sfxClick.play();
          submitTurn(scene);
        }
      }, staticHudGroup);

      moveHandle = scene.add.circle(0, 0, 10, 0x00ff00).setStrokeStyle(3, 0x000000).setDepth(300).setVisible(false).setInteractive({ draggable: true });
      attackHandle = scene.add.circle(0, 0, 10, 0xff0000).setStrokeStyle(3, 0x000000).setDepth(300).setVisible(false).setInteractive({ draggable: true });

      moveHandle.on('drag', (pointer, dragX, dragY) => {
        if (selectedShip && !isExecuting && !isWaiting && !matchEnded) {
          const clamped = clampPoint(dragX, dragY);
          moveHandle.setPosition(clamped.x, clamped.y);
          const dist = Phaser.Math.Distance.Between(selectedShip.x, selectedShip.y, clamped.x, clamped.y);
          const isBlocked = !checkRaycast(selectedShip.x, selectedShip.y, clamped.x, clamped.y);

          if (dist <= selectedShip.stats.moveRange && !isBlocked) {
            selectedShip.plannedMove = { x: clamped.x, y: clamped.y };
            moveHandle.setFillStyle(0x00ff00);
          } else {
            moveHandle.setFillStyle(0x555555);
          }
        }
      });

      attackHandle.on('drag', (pointer, dragX, dragY) => {
        if (selectedShip && !isExecuting && !isWaiting && !matchEnded) {
          const clamped = clampPoint(dragX, dragY);
          attackHandle.setPosition(clamped.x, clamped.y);
          selectedShip.plannedAttack = { x: clamped.x, y: clamped.y };
        }
      });

      setupInputs(scene);
      startTimer(scene);
    }

    function startTimer(scene) {
      if (timerEvent) timerEvent.remove();
      const endTime = Date.now() + (TURN_TIME_LIMIT * 1000);
      timeLeft = TURN_TIME_LIMIT;
      timerText.setText(`${t('TIMER_LABEL')}${timeLeft}`);
      timerText.setColor('#ffffff');

      timerEvent = scene.time.addEvent({
        delay: 200,
        callback: () => {
          if (isExecuting || isWaiting || matchEnded) return;
          const now = Date.now();
          const secondsLeft = Math.ceil((endTime - now) / 1000);
          if (secondsLeft !== timeLeft) {
            timeLeft = secondsLeft;
            if (timeLeft < 0) timeLeft = 0;
            timerText.setText(`${t('TIMER_LABEL')}${timeLeft}`);
            if (timeLeft <= 10) timerText.setColor('#ff0000');
            if (timeLeft <= 0) submitTurn(scene);
          }
        },
        loop: true
      });
    }

    function stopTimer() {
      if (timerEvent) timerEvent.remove();
      timerText.setText(t('WAITING_LABEL'));
      timerText.setColor('#ffff00');
    }

    function spawnShip(scene, x, y, stats, faction, index, netOwner) {
      const ship = scene.physics.add.sprite(x, y, stats.sprite);
      ship.setScale(0.17);
      if (faction === 'ENEMY') ship.angle = 180;

      ship.setCollideWorldBounds(true);

      const r = stats.hitRadius ?? 16;
      ship.body.setCircle(r);

      const baseOffsetX = (ship.displayWidth / 2) - r;
      const baseOffsetY = (ship.displayHeight / 2) - r;
      const manualX = stats.hitOffset?.x ?? 0;
      const manualY = stats.hitOffset?.y ?? 0;
      ship.body.setOffset(baseOffsetX + manualX, baseOffsetY + manualY);

      ship.stats = stats;
      ship.hp = stats.hp;
      ship.predictedHp = null;

      ship.faction = faction;
      ship.squadIndex = index;

      // ✅ ID absoluto de rede
      ship.netOwner = netOwner;              // 'HOST' / 'GUEST'
      ship.netId = `${netOwner}_${index}`;   // 'HOST_0' etc

      ship.weapon = WEAPONS.CANNON;
      ship.hasCrashed = false;

      shipsGroup.add(ship);
      if (faction === 'PLAYER') playerSquad.push(ship);
      else enemySquad.push(ship);

      return ship;
    }

    async function submitTurn(scene) {
      if (matchEnded) return;
      if (isWaiting || isExecuting) return;
      stopTimer();

      if (!isTraining) {
        const sSnap = await get(ref(db, `rooms/${roomId}/surrender`));
        if (sSnap.exists() && sSnap.val()) return;
      }

      const myMoves = playerSquad.map(s => ({
        index: s.squadIndex,
        move: s.plannedMove ? { x: s.plannedMove.x, y: s.plannedMove.y } : null,
        attack: s.plannedAttack ? { x: s.plannedAttack.x, y: s.plannedAttack.y, weapon: s.weapon.id } : null
      }));

      if (isTraining) {
        const aiMoves = enemySquad.map(e => {
          if (!e.active) return { index: e.squadIndex, move: null, attack: null };
          const target = playerSquad.find(p => p.active);
          let mv = null, atk = null;
          e.weapon = Math.random() > 0.5 ? WEAPONS.CANNON : WEAPONS.FLAK;
          if (target) atk = { x: target.x, y: target.y, weapon: e.weapon.id };
          if (Math.random() > 0.4) {
            const tx = Phaser.Math.Clamp(e.x + (Math.random() - 0.5) * 150, 30, TOTAL_WIDTH - 30);
            const ty = Phaser.Math.Clamp(e.y + (Math.random() - 0.5) * 150, 30, PLAY_HEIGHT - 30);
            if (checkRaycast(e.x, e.y, tx, ty)) mv = { x: tx, y: ty };
          }
          return { index: e.squadIndex, move: mv, attack: atk };
        });
        const turnData = { host: myMoves, guest: aiMoves };
        runTurnResolution(scene, turnData);
        return;
      }

      isWaiting = true;
      turnText.setText(t('STATUS_WAITING'));
      uiGroup.setVisible(false);
      if (selectedShip) deselectAll();

      const currentT = turnRefValue.current;
      const role = isHost ? 'host' : 'guest';
      await set(ref(db, `rooms/${roomId}/turns/${currentT}/${role}`), myMoves);
    }

    function clearPredictions() {
      [...playerSquad, ...enemySquad].forEach(s => { s.predictedHp = null; });
    }

    function applyHpState(hpState) {
      [...playerSquad, ...enemySquad].forEach(ship => {
        const v = hpState?.[ship.netId];
        if (v === undefined) return;

        ship.hp = v;
        ship.predictedHp = null;

        if (ship.hp <= 0) {
          ship.body.enable = false;
          ship.setActive(false).setVisible(false);
          if (selectedShip === ship) deselectAll();
        } else {
          ship.setVisible(true).setActive(true);
          if (ship.body) ship.body.enable = true;
        }
      });
    }

    async function waitTurnResult(roomIdLocal, turnNumber) {
      const resultRef = ref(db, `rooms/${roomIdLocal}/turnResults/${turnNumber}`);
      return await new Promise((resolve) => {
        const unsub = onValue(resultRef, (snap) => {
          if (snap.exists()) {
            unsub();
            resolve(snap.val());
          }
        });
      });
    }

    async function runTurnResolution(scene, turnData) {
      if (matchEnded) return;

      isExecuting = true;
      isWaiting = true;
      turnText.setText(t('EXECUTING_LABEL'));
      stopTimer();

      clearPredictions();
      if (selectedShip) deselectAll();
      uiGroup.setVisible(false);

      [...playerSquad, ...enemySquad].forEach(s => s.hasCrashed = false);

      const myData = isHost ? turnData.host : turnData.guest;
      const enemyData = isHost ? turnData.guest : turnData.host;

      playerSquad.forEach(s => {
        const plan = myData.find(p => p.index === s.squadIndex);
        if (plan) { if (plan.move) s.plannedMove = plan.move; if (plan.attack) s.plannedAttack = plan.attack; }
      });

      enemySquad.forEach(s => {
        const plan = enemyData.find(p => p.index === s.squadIndex);
        if (plan) { if (plan.move) s.plannedMove = plan.move; if (plan.attack) s.plannedAttack = plan.attack; }
      });

      [...playerSquad, ...enemySquad].forEach(s => {
        const target = s.plannedMove || s.plannedAttack;
        if (target && s.active) s.setRotation(Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y));
      });

      [...playerSquad, ...enemySquad].forEach(s => {
        if (!s.active) return;
        if (s.plannedAttack) fireWeapon(scene, s, s.plannedAttack.x, s.plannedAttack.y);
        if (s.plannedMove) moveShip(scene, s, s.plannedMove.x, s.plannedMove.y);
      });

      // deixa a animação rodar
      await new Promise(r => setTimeout(r, 2500));

      // ✅ RESULTADO AUTORITATIVO DO TURNO (Host grava, Guest espera e aplica)
      if (!isTraining) {
        const currentT = turnRefValue.current;
        const hpState = {};
        [...playerSquad, ...enemySquad].forEach(ship => { hpState[ship.netId] = ship.hp; });

        if (isHost) {
          await set(ref(db, `rooms/${roomId}/turnResults/${currentT}`), { hpState, at: Date.now() });
          applyHpState(hpState); // garante consistência local do host também
        } else {
          const data = await waitTurnResult(roomId, currentT);
          applyHpState(data?.hpState);
        }
      }

      [...playerSquad, ...enemySquad].forEach(s => {
        s.plannedMove = null;
        s.plannedAttack = null;
        if (s.active) s.body.setVelocity(0, 0);
      });

      isExecuting = false;
      isWaiting = false;
      turnRefValue.current = turnRefValue.current + 1;

      turnText.setText(t('TURN_YOURS'));
      uiGroup.setVisible(true);

      checkWinCondition();
      startTimer(scene);
    }

    function checkWinCondition() {
      const playerAlive = playerSquad.some(s => s.active);
      const enemyAlive = enemySquad.some(s => s.active);

      if (!playerAlive && !enemyAlive) { gameRef.current.destroy(true); onGameOver('DRAW'); }
      else if (!playerAlive) { gameRef.current.destroy(true); onGameOver('DEFEAT'); }
      else if (!enemyAlive) { gameRef.current.destroy(true); onGameOver('VICTORY'); }
    }

    function getHitboxCenter(ship) {
      return { x: ship.body.x + ship.body.halfWidth, y: ship.body.y + ship.body.halfHeight };
    }

    function deselectAll() {
      if (selectedShip) selectedShip.isSelected = false;
      selectedShip = null;
      moveHandle.setVisible(false);
      attackHandle.setVisible(false);
      uiGroup.removeAll(true);
      updateHUDInfo();
    }

    function updateHUDInfo() {
      if (selectedShip && selectedShip.active) {
        txtName.setText(selectedShip.stats.name);

        const shownHp = Math.floor(selectedShip.predictedHp ?? selectedShip.hp);
        txtHP.setText(`HP : ${shownHp}/${selectedShip.stats.hp}`);

        txtSPD.setText(`SPD: ${selectedShip.stats.speed}`);
        const currentDmg = selectedShip.weapon.damage;
        const dmgDisplay = selectedShip.weapon.type === 'SPREAD' ? `${currentDmg}x3` : currentDmg;
        txtDMG.setText(`DMG: ${dmgDisplay}`);
      } else {
        txtName.setText(t('SELECT_SHIP'));
        txtHP.setText("");
        txtSPD.setText("");
        txtDMG.setText("");
      }
    }

    function clampPoint(x, y) {
      return { x: Phaser.Math.Clamp(x, 25, TOTAL_WIDTH - 25), y: Phaser.Math.Clamp(y, 25, PLAY_HEIGHT - 25) };
    }

    function setupInputs(scene) {
      scene.input.on('pointerdown', (pointer) => {
        if (matchEnded) return;
        if (isExecuting || isWaiting) return;
        if (pointer.y > PLAY_HEIGHT) return;

        const draggedObjects = scene.input.hitTestPointer(pointer).filter(obj => obj === moveHandle || obj === attackHandle);
        if (draggedObjects.length > 0) return;

        let clickedShip = null;
        playerSquad.forEach(s => {
          if (Phaser.Math.Distance.Between(pointer.x, pointer.y, s.x, s.y) < (s.displayWidth * 0.8)) clickedShip = s;
        });

        if (clickedShip) {
          if (clickedShip === selectedShip) { deselectAll(); return; }
          if (selectedShip) selectedShip.isSelected = false;
          if (sfxClick) sfxClick.play();
          clickedShip.isSelected = true;
          selectedShip = clickedShip;
          updateHandles();
          drawUI(scene);
          updateHUDInfo();
          return;
        }

        if (selectedShip && selectedShip.active) {
          const target = clampPoint(pointer.x, pointer.y);

          if (pointer.rightButtonDown()) {
            if (sfxClick) sfxClick.play();
            selectedShip.plannedAttack = { x: target.x, y: target.y };
            updateHandles(); drawUI(scene);
          } else if (pointer.leftButtonDown()) {
            const dist = Phaser.Math.Distance.Between(selectedShip.x, selectedShip.y, target.x, target.y);
            if (dist <= selectedShip.stats.moveRange) {
              if (checkRaycast(selectedShip.x, selectedShip.y, target.x, target.y)) {
                if (sfxClick) sfxClick.play();
                selectedShip.plannedMove = { x: target.x, y: target.y };
                updateHandles(); drawUI(scene);
              } else {
                showFloatText(scene, target.x, target.y, t('BLOCKED_LABEL'), '#ff0000');
              }
            } else {
              deselectAll();
            }
          }
        } else {
          deselectAll();
        }
      });

      scene.input.keyboard.on('keydown-SPACE', () => { if (!isExecuting) submitTurn(scene); });
      scene.input.keyboard.on('keydown-ESC', () => { game.destroy(true); onExit(); });
    }

    function fireWeapon(scene, shooter, tx, ty) {
      if (sfxShoot) sfxShoot.play();

      const weapon = shooter.weapon;
      const baseAngle = Phaser.Math.Angle.Between(shooter.x, shooter.y, tx, ty);

      const spawnBullet = (angleOffset) => {
        const angle = baseAngle + angleOffset;
        const sx = shooter.x + Math.cos(angle) * 45;
        const sy = shooter.y + Math.sin(angle) * 45;

        const proj = scene.add.circle(sx, sy, weapon.radius, weapon.color);
        scene.physics.add.existing(proj);
        projectileGroup.add(proj);

        proj.owner = shooter;
        proj.ownerNetOwner = shooter.netOwner; // ✅
        proj.damage = weapon.damage;

        proj.body.setCircle(weapon.radius + 8);
        proj.body.setOffset(-8, -8);

        const velocityX = Math.cos(angle) * weapon.speed;
        const velocityY = Math.sin(angle) * weapon.speed;
        proj.body.setVelocity(velocityX, velocityY);

        scene.time.delayedCall(2000, () => { if (proj.active) proj.destroy(); });
      };

      if (weapon.type === 'SINGLE') spawnBullet(0);
      else if (weapon.type === 'SPREAD') { spawnBullet(0); spawnBullet(-0.2); spawnBullet(0.2); }
    }

    function moveShip(scene, ship, tx, ty) {
      const dist = Phaser.Math.Distance.Between(ship.x, ship.y, tx, ty);
      const duration = (dist / ship.stats.speed) * 1000;
      scene.tweens.add({ targets: ship, x: tx, y: ty, duration: duration, ease: 'Quad.easeInOut' });
    }

    // ✅ dano REAL (pode matar)
    function takeDamage(scene, ship, dmg, allowKill) {
      ship.hp -= dmg;
      showFloatText(scene, ship.x, ship.y - 40, `-${dmg}`, '#ff0000');

      if (ship.hp <= 0 && allowKill) {
        if (sfxExplosion) sfxExplosion.play();
        const boom = scene.add.circle(ship.x, ship.y, 50, 0xffffff);
        scene.tweens.add({ targets: boom, scale: 3, alpha: 0, duration: 400, onComplete: () => boom.destroy() });

        ship.body.enable = false;
        ship.setActive(false).setVisible(false);
        if (selectedShip === ship) deselectAll();
      } else {
        ship.setTint(0xff0000);
        scene.time.delayedCall(100, () => { if (ship.active) ship.clearTint(); });
      }
    }

    // ✅ dano previsto (só UI: barra/feedback, NÃO mata)
    function takeDamagePredicted(scene, ship, dmg) {
      if (!ship.active) return;

      const base = (ship.predictedHp ?? ship.hp);
      ship.predictedHp = base - dmg;

      showFloatText(scene, ship.x, ship.y - 40, `-${dmg}`, '#ff6666');

      ship.setTint(0xff6666);
      scene.time.delayedCall(80, () => { if (ship.active) ship.clearTint(); });

      // importante: NÃO desativa body, NÃO esconde nave
      if (selectedShip === ship) updateHUDInfo();
    }

    function checkRaycast(x1, y1, x2, y2) {
      const line = new Phaser.Geom.Line(x1, y1, x2, y2);
      for (let obj of obstacleGroup.getChildren()) {
        const rect = obj.getBounds();
        if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) return false;
      }
      return true;
    }

    function showFloatText(scene, x, y, text, color) {
      const txt = scene.add.text(x, y, text, { font: '20px monospace', fill: color, stroke: '#000', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(200);
      scene.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    function drawHP(ship) {
      const hpForBar = (ship.predictedHp ?? ship.hp);
      const pct = Math.max(0, hpForBar / ship.stats.hp);

      graphics.fillStyle(0x000000);
      graphics.fillRect(ship.x - 20, ship.y - 45, 40, 6);

      graphics.fillStyle(ship.faction === 'PLAYER' ? 0x00ff00 : 0xff0000);
      graphics.fillRect(ship.x - 20, ship.y - 45, 40 * pct, 6);
    }

    function drawUI(scene) {
      uiGroup.removeAll(true);
      if (!selectedShip) return;
      const centerY = PLAY_HEIGHT + (HUD_HEIGHT / 2);

      createButton(scene, TOTAL_WIDTH - 420, centerY, "1. CANNON", 130, 50,
        selectedShip.weapon.id === 'CANNON' ? 0x008800 : 0x333333,
        () => { selectedShip.weapon = WEAPONS.CANNON; drawUI(scene); updateHUDInfo(); },
        uiGroup
      );

      createButton(scene, TOTAL_WIDTH - 280, centerY, "2. FLAK", 130, 50,
        selectedShip.weapon.id === 'FLAK' ? 0x008800 : 0x333333,
        () => { selectedShip.weapon = WEAPONS.FLAK; drawUI(scene); updateHUDInfo(); },
        uiGroup
      );

      let cancelX = 250;
      if (selectedShip.plannedMove) {
        createButton(scene, cancelX, centerY, t('BTN_MOVE'), 100, 40, 0xaa0000,
          () => { selectedShip.plannedMove = null; updateHandles(); drawUI(scene); },
          uiGroup
        );
        cancelX += 110;
      }
      if (selectedShip.plannedAttack) {
        createButton(scene, cancelX, centerY, t('BTN_ATK'), 100, 40, 0xaa0000,
          () => { selectedShip.plannedAttack = null; updateHandles(); drawUI(scene); },
          uiGroup
        );
      }
    }

    function createButton(scene, x, y, text, w, h, color, callback, targetGroup) {
      const container = scene.add.container(x, y);
      const bg = scene.add.rectangle(0, 0, w, h, color)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback);

      const label = scene.add.text(0, 0, text, {
        fontSize: '13px', fontStyle: 'bold', fontFamily: 'Arial', align: 'center'
      }).setOrigin(0.5);

      container.add([bg, label]);
      if (targetGroup) targetGroup.add(container);
      return container;
    }

    function updateHandles() {
      if (!selectedShip) return;

      if (selectedShip.plannedMove) {
        moveHandle.setPosition(selectedShip.plannedMove.x, selectedShip.plannedMove.y);
        moveHandle.setVisible(true);
        moveHandle.setFillStyle(0x00ff00);
      } else {
        moveHandle.setVisible(false);
      }

      if (selectedShip.plannedAttack) {
        attackHandle.setPosition(selectedShip.plannedAttack.x, selectedShip.plannedAttack.y);
        attackHandle.setVisible(true);
      } else {
        attackHandle.setVisible(false);
      }
    }

    function update() {
      graphics.clear();

      if (isExecuting) {
        moveHandle.setVisible(false);
        attackHandle.setVisible(false);
        [...playerSquad, ...enemySquad].forEach(ship => { if (ship.active) drawHP(ship); });
        return;
      }

      [...playerSquad].forEach(ship => {
        if (!ship.active) return;

        drawHP(ship);

        if (ship.plannedMove) {
          graphics.lineStyle(2, 0x00ff00, 0.8);
          graphics.lineBetween(ship.x, ship.y, ship.plannedMove.x, ship.plannedMove.y);
        }

        if (ship.plannedAttack) {
          graphics.lineStyle(2, 0xff0000, 0.8);
          graphics.lineBetween(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);

          if (ship.weapon.type === 'SPREAD') {
            const angle = Phaser.Math.Angle.Between(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);
            const dist = Phaser.Math.Distance.Between(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);
            const p1 = { x: ship.x + Math.cos(angle - 0.2) * dist, y: ship.y + Math.sin(angle - 0.2) * dist };
            const p2 = { x: ship.x + Math.cos(angle + 0.2) * dist, y: ship.y + Math.sin(angle + 0.2) * dist };
            graphics.lineStyle(1, 0xff0000, 0.3);
            graphics.lineBetween(ship.x, ship.y, p1.x, p1.y);
            graphics.lineBetween(ship.x, ship.y, p2.x, p2.y);
          }
        }

        if (ship.isSelected) {
          const c = getHitboxCenter(ship);
          graphics.lineStyle(2, 0x00ff00);
          graphics.strokeCircle(c.x, c.y, ship.body.radius);
          graphics.lineStyle(1, 0x00ff00, 0.15);
          graphics.strokeCircle(c.x, c.y, ship.stats.moveRange);
        }
      });

      [...enemySquad].forEach(ship => { if (ship.active) drawHP(ship); });
    }

    return () => {
      if (unsubscribeTurns) unsubscribeTurns();
      if (unsubscribeSurrender) unsubscribeSurrender();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [roomId, isHost, isTraining, lang]);

  return <div id="phaser-container" />;
};

const styles = {
  backgroundWrapper: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)' },
  gameContainer: { width: `${TOTAL_WIDTH}px`, height: `${TOTAL_HEIGHT}px`, position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', background: '#000', border: '1px solid #333' },
  menuBox: { width: '100%', height: '100%', backgroundImage: 'url(assets/intro.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },
  menuContent: { width: '100%', padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  instructionsBox: { textAlign: 'center', marginBottom: 20, textShadow: '0 2px 4px black' },
  title: { fontSize: '3rem', color: '#00ccff', marginBottom: 10, fontFamily: 'Arial', fontWeight: '900', letterSpacing: '2px', textAlign: 'center', textShadow: '0 0 15px #00ccff' },
  cardRow: { display: 'flex', gap: 20, marginBottom: 20 },
  card: { width: 160, padding: 15, background: 'rgba(0, 20, 40, 0.7)', border: '1px solid #005577', borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)', color: '#fff' },
  cardImage: { width: '80%', height: 'auto', display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))' },
  statLine: { fontSize: '11px', color: '#aaa', marginTop: 5, fontWeight: 'bold' },
  slotsContainer: { display: 'flex', gap: 10, marginBottom: 20 },
  slotActive: { width: 120, height: 35, border: '1px solid #00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 50, 0, 0.8)', borderRadius: 4, fontSize: '12px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  slotEmpty: { width: 120, height: 35, border: '1px dashed #666', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 4, fontSize: '12px', color: '#666' },
  startBtn: { padding: '12px 50px', fontSize: '1.2rem', background: 'linear-gradient(90deg, #0077ff, #00aaff)', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 0 15px rgba(0,119,255,0.5)' },
  btn: { padding: '12px 40px', fontSize: '1.2rem', background: '#0077ff', border: 'none', borderRadius: 30, cursor: 'pointer', fontWeight: 'bold', color: '#fff', boxShadow: '0 4px 10px rgba(0,119,255,0.4)' },
  overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  lobbyBox: { width: 300, padding: 30, background: 'rgba(0,0,0,0.6)', border: '1px solid #444', borderRadius: 10, textAlign: 'center' },
  input: { padding: 10, fontSize: 24, textAlign: 'center', width: '100%', marginBottom: 20, background: '#111', border: '1px solid #555', color: '#fff', borderRadius: 5, letterSpacing: 5, textTransform: 'uppercase' }
};
