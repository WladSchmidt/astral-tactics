import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import AudioDock from './components/AudioDock';
import LanguageSwitcher from './components/LanguageSwitcher';
import LobbyScreen from './components/LobbyScreen';
import SquadMenuScreen from './components/SquadMenuScreen';
import GameOverOverlay from './components/GameOverOverlay';
import styles from './styles/appStyles';
import {
  TOTAL_WIDTH,
  TOTAL_HEIGHT,
  HUD_HEIGHT,
  PLAY_HEIGHT,
  TURN_TIME_LIMIT,
  MUSIC_TRACKS,
  SHIP_STATS,
  WEAPONS,
  UI_THEME,
  generateMapData
} from './game/constants';
import { TEXTS } from './game/texts';

// 🔥 FIREBASE
import { db, auth } from './firebaseConfig';
import { ref, set, get, onValue, update, runTransaction, push } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';




export default function App() {
  const [lang, setLang] = useState('PT');
  const [gameState, setGameState] = useState('LOBBY');
  const [mySquad, setMySquad] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [runId, setRunId] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [roomMatchVersion, setRoomMatchVersion] = useState(1);
  const [isSurrendering, setIsSurrendering] = useState(false);

  // --- ÁUDIO GLOBAL ---
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatPanelPos, setChatPanelPos] = useState({ x: 0, y: 0 });
  const [chatPanelReady, setChatPanelReady] = useState(false);
  const audioRef = useRef(null);
  const chatDragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const chatJoinSentRef = useRef({});

  const t = (key) => TEXTS[lang][key] || key;
  const surrenderHandledRef = useRef(false);
  const rematchResolvedRef = useRef(false);
  const rematchResettingRef = useRef(false);

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

  const normalizedPlayerName = () => playerName.trim().replace(/\s+/g, ' ').slice(0, 18);
  const ensurePlayerName = () => {
    const normalized = normalizedPlayerName();
    if (!normalized) {
      setStatusMsg(t('STATUS_NAME_REQUIRED'));
      return null;
    }
    if (normalized !== playerName) setPlayerName(normalized);
    return normalized;
  };

  // --- GAME LOGIC ---
  const startTraining = () => {
    playClick();
    const validName = ensurePlayerName();
    if (!validName) return;
    setIsTraining(true);
    setIsHost(true);
    setRoomId('OFFLINE');
    setOpponentName('IA');
    setGameState('MENU');
    setStatusMsg(t('STATUS_P2_CONNECTED'));
  };

  const createRoom = async () => {
    playClick();
    const validName = ensurePlayerName();
    if (!validName) return;
    setIsTraining(false);
    setStatusMsg(t('STATUS_CREATING'));
    try {
      const user = await signInAnonymously(auth);
      const uid = user.user.uid;
      setIsHost(true);
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomId(code);
      setOpponentName('GUEST');
      const mapData = generateMapData();
      await set(ref(db, `rooms/${code}`), { host: uid, status: 'LOBBY', turn: 1, map: mapData, matchVersion: 1 });
      setRoomMatchVersion(1);
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
    const validName = ensurePlayerName();
    if (!validName) return;
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
        setRoomMatchVersion((snap.val() || {}).matchVersion || 1);
        setRoomId(joinCode);
        setOpponentName('HOST');
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
    if (isTraining) {
      setRunId(prev => prev + 1);
      setGameResult(null);
      setGameState('PLAYING');
      return;
    }

    if (!roomId) return;
    const myRole = isHost ? 'host' : 'guest';
    try {
      setStatusMsg(t('REMATCH_SENT'));
      await update(ref(db, `rooms/${roomId}`), { [`rematchRequests/${myRole}`]: Date.now() });
    } catch (e) {
      setStatusMsg(t('STATUS_ERROR') + e.message);
    }
  };

  const backToMenu = () => { playClick(); setMySquad([]); setGameState('LOBBY'); window.location.reload(); };

  const sendChatMessage = async () => {
    if (isTraining || !roomId) return;
    const text = chatInput.trim().slice(0, 200);
    if (!text) return;
    try {
      const msgRef = push(ref(db, `rooms/${roomId}/chat`));
      await set(msgRef, {
        uid: auth.currentUser?.uid || '',
        role: isHost ? 'HOST' : 'GUEST',
        name: normalizedPlayerName() || (isHost ? 'HOST' : 'GUEST'),
        text,
        ts: Date.now()
      });
      setChatInput('');
    } catch (e) {
      setStatusMsg(t('STATUS_ERROR') + e.message);
    }
  };

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

  useEffect(() => {
    if (!roomId || isTraining || gameState !== 'PLAYING') return;

    const chatRef = ref(db, `rooms/${roomId}/chat`);

    const unsubChat = onValue(chatRef, (snapshot) => {
      const raw = snapshot.val();
      if (!raw) {
        setChatMessages([]);
        return;
      }
      const ordered = Object.entries(raw)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .slice(-60);
      setChatMessages(ordered);
    });

    return () => {
      unsubChat();
    };
  }, [roomId, isTraining, gameState, isHost]);

  useEffect(() => {
    if (!roomId || isTraining || gameState !== 'PLAYING') return;
    const uid = auth.currentUser?.uid;
    const name = normalizedPlayerName();
    if (!uid || !name) return;

    const key = `${roomId}:${uid}:${runId}`;
    if (chatJoinSentRef.current[key]) return;
    chatJoinSentRef.current[key] = true;

    const msgRef = push(ref(db, `rooms/${roomId}/chat`));
    set(msgRef, {
      uid,
      role: isHost ? 'HOST' : 'GUEST',
      name,
      kind: 'SYS_JOIN',
      text: '',
      ts: Date.now()
    }).catch(() => { });
  }, [roomId, isTraining, gameState, runId, isHost]);

  const selfPilotName = normalizedPlayerName();
  const findNameByRole = (role) => {
    if (!role) return '';
    for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
      const m = chatMessages[i];
      if (m?.role === role && typeof m?.name === 'string' && m.name.trim()) {
        return m.name.trim().slice(0, 18);
      }
    }
    return '';
  };
  const hostPilotLabel = findNameByRole('HOST') || (isHost ? (selfPilotName || 'Piloto Host') : 'Piloto Host');
  const guestPilotLabel = findNameByRole('GUEST') || (!isHost ? (selfPilotName || 'Piloto Guest') : 'Piloto Guest');

  useEffect(() => {
    if (isTraining || gameState !== 'PLAYING') {
      setChatPanelReady(false);
      return;
    }

    const panelWidth = 280;
    const panelHeight = 340;
    const preferredX = Math.round((window.innerWidth / 2) + (TOTAL_WIDTH / 2) + 16);
    const preferredY = Math.round((window.innerHeight / 2) - (TOTAL_HEIGHT / 2) + 70);
    const maxX = Math.max(10, window.innerWidth - panelWidth - 10);
    const maxY = Math.max(10, window.innerHeight - panelHeight - 10);
    const x = Math.min(Math.max(10, preferredX), maxX);
    const y = Math.min(Math.max(10, preferredY), maxY);
    setChatPanelPos({ x, y });
    setChatPanelReady(true);
  }, [gameState, isTraining, roomId, runId]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!chatDragRef.current.dragging) return;
      const panelWidth = 280;
      const panelHeight = 340;
      const maxX = Math.max(10, window.innerWidth - panelWidth - 10);
      const maxY = Math.max(10, window.innerHeight - panelHeight - 10);
      const nx = Math.min(Math.max(10, e.clientX - chatDragRef.current.offsetX), maxX);
      const ny = Math.min(Math.max(10, e.clientY - chatDragRef.current.offsetY), maxY);
      setChatPanelPos({ x: nx, y: ny });
    };
    const onMouseUp = () => {
      chatDragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!roomId || isTraining || gameState !== 'GAMEOVER') return;

    rematchResolvedRef.current = false;
    rematchResettingRef.current = false;

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const myKey = isHost ? 'host' : 'guest';
      const oppKey = isHost ? 'guest' : 'host';
      const req = data.rematchRequests || {};
      const myAsked = !!req[myKey];
      const oppAsked = !!req[oppKey];
      const remoteVersion = data.matchVersion || 1;

      if (remoteVersion > roomMatchVersion && !rematchResolvedRef.current) {
        rematchResolvedRef.current = true;
        setRoomMatchVersion(remoteVersion);
        setMySquad([]);
        setGameResult(null);
        setStatusMsg('');
        setRunId(prev => prev + 1);
        setGameState('MENU');
        return;
      }

      if (myAsked && !oppAsked) setStatusMsg(t('REMATCH_SENT'));
      else if (!myAsked && oppAsked) setStatusMsg(t('REMATCH_OPP'));
      else if (myAsked && oppAsked) setStatusMsg(t('REMATCH_STARTING'));

      if (isHost && myAsked && oppAsked && !rematchResettingRef.current) {
        rematchResettingRef.current = true;
        const nextVersion = (data.matchVersion || 1) + 1;
        const newMap = generateMapData();
        try {
          await update(roomRef, {
            matchVersion: nextVersion,
            turn: 1,
            map: newMap,
            hostSquad: null,
            guestSquad: null,
            turns: null,
            turnResults: null,
            turnLive: null,
            surrender: null,
            rematchRequests: null
          });
        } catch (e) {
          rematchResettingRef.current = false;
          setStatusMsg(t('STATUS_ERROR') + e.message);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, isTraining, gameState, isHost, roomMatchVersion, t]);

  const addShipToSquad = (shipId) => {
    playClick();
    if (mySquad.length < 3) setMySquad([...mySquad, shipId]);
  };

  const removeShipFromSquad = (idx) => {
    playClick();
    const ns = [...mySquad];
    ns.splice(idx, 1);
    setMySquad(ns);
  };

  return (
    <>
      <style>{`
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #121220; overflow: hidden; font-family: 'Segoe UI', Tahoma, sans-serif; }
        * { box-sizing: border-box; user-select: none; }
        .ship-card:hover { transform: translateY(-5px); border-color: #00ffff !important; box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important; }
        input::placeholder { color: #555; }
      `}</style>

      <audio
        ref={audioRef}
        src={MUSIC_TRACKS[currentTrackIndex]}
        onEnded={handleMusicEnded}
        loop={false}
      />

      <div style={styles.backgroundWrapper}>
        <AudioDock
          isGlobalMuted={isGlobalMuted}
          isMusicPlaying={isMusicPlaying}
          onPrevTrack={handlePrevTrack}
          onTogglePlay={() => setIsMusicPlaying(!isMusicPlaying)}
          onNextTrack={handleNextTrack}
          onToggleMute={() => setIsGlobalMuted(!isGlobalMuted)}
        />
        <div style={styles.gameContainer}>
          {gameState === 'LOBBY' && <LanguageSwitcher lang={lang} setLang={setLang} />}

          {gameState === 'LOBBY' && (
            <LobbyScreen
              t={t}
              styles={styles}
              playerName={playerName}
              setPlayerName={setPlayerName}
              joinCode={joinCode}
              setJoinCode={setJoinCode}
              statusMsg={statusMsg}
              onStartTraining={startTraining}
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
            />
          )}

          {gameState === 'MENU' && (
            <SquadMenuScreen
              t={t}
              styles={styles}
              roomId={roomId}
              mySquad={mySquad}
              statusMsg={statusMsg}
              onAddShip={addShipToSquad}
              onRemoveShip={removeShipFromSquad}
              onLockInSquad={lockInSquad}
            />
          )}

          {gameState === 'PLAYING' && (
            <>
              <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
                <button
                  style={{ background: 'rgba(255, 0, 0, 0.2)', border: '1px solid #ff0000', color: '#ff0000', padding: '5px 10px', borderRadius: 4, cursor: isSurrendering ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '10px', opacity: isSurrendering ? 0.7 : 1 }}
                  disabled={isSurrendering}
                  onClick={async () => {
                    if (!window.confirm(t('SURRENDER_CONFIRM'))) return;
                    if (isTraining) { handleGameOver('DEFEAT'); return; }
                    try {
                      setIsSurrendering(true);
                      const surrenderRole = isHost ? 'HOST' : 'GUEST';
                      await runTransaction(ref(db, `rooms/${roomId}/surrender`), (current) => {
                        if (current) return current;
                        return surrenderRole;
                      });
                    }
                    catch (err) { alert('Erro: ' + err.message); }
                    finally { setIsSurrendering(false); }
                  }}
                >
                  {t('BTN_SURRENDER')}
                </button>
              </div>

              <PhaserGame
                key={`${runId}-${roomId}-${isTraining ? 'T' : 'M'}`}
                roomId={roomId}
                isHost={isHost}
                isTraining={isTraining}
                mySquadList={mySquad}
                onGameOver={handleGameOver}
                onExit={backToMenu}
                t={t}
                isGlobalMuted={isGlobalMuted}
              />
            </>
          )}

          {gameState === 'GAMEOVER' && (
            <GameOverOverlay
              t={t}
              styles={styles}
              gameResult={gameResult}
              getResultColor={getResultColor}
              onRestart={restartGame}
              onBackToMenu={backToMenu}
              isTraining={isTraining}
              statusMsg={statusMsg}
            />
          )}
        </div>

        {!isTraining && gameState === 'PLAYING' && chatPanelReady && (
          <div
            style={{
              position: 'fixed',
              left: chatPanelPos.x,
              top: chatPanelPos.y,
              width: 280,
              height: 340,
              zIndex: 1600,
              border: '1px solid rgba(0, 204, 255, 0.45)',
              borderRadius: 10,
              background: 'linear-gradient(180deg, rgba(5, 22, 38, 0.92), rgba(2, 12, 22, 0.9))',
              boxShadow: '0 0 18px rgba(0, 204, 255, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              onMouseDown={(e) => {
                chatDragRef.current.dragging = true;
                chatDragRef.current.offsetX = e.clientX - chatPanelPos.x;
                chatDragRef.current.offsetY = e.clientY - chatPanelPos.y;
              }}
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid rgba(0, 204, 255, 0.2)',
                color: '#7fe9ff',
                fontWeight: 'bold',
                fontSize: 12,
                cursor: 'move',
                background: 'rgba(0, 22, 40, 0.55)'
              }}
            >
              {t('CHAT_TITLE')} ({hostPilotLabel} vs {guestPilotLabel})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {chatMessages.filter((msg) => msg?.kind !== 'SYS_JOIN').map((msg) => (
                <div key={msg.id} style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.35 }}>
                  <span style={{ color: '#7fe9ff', fontWeight: 'bold' }}>{msg.name || 'Player'}: </span>
                  <span style={{ color: '#d6ecff' }}>{msg.text || ''}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid rgba(0, 204, 255, 0.2)' }}>
              <input
                type="text"
                value={chatInput}
                maxLength={200}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                placeholder={t('CHAT_PLACEHOLDER')}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: '1px solid rgba(0, 204, 255, 0.35)',
                  background: 'rgba(0, 0, 0, 0.45)',
                  color: '#d6ecff',
                  padding: '0 8px',
                  outline: 'none',
                  fontSize: 12
                }}
              />
              <button
                onClick={sendChatMessage}
                style={{
                  height: 30,
                  borderRadius: 6,
                  border: '1px solid #00ccff',
                  background: 'rgba(0, 149, 255, 0.25)',
                  color: '#9de7ff',
                  fontWeight: 'bold',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '0 10px'
                }}
              >
                {t('CHAT_SEND')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- PHASER GAME COMPONENT ---
const PhaserGame = ({ roomId, isHost, isTraining, mySquadList, onGameOver, onExit, t, isGlobalMuted }) => {
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
      physics: { default: 'arcade', arcade: { debug: false, gravity: { y: 0 }, fps: 60, fixedStep: true } },
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
    let unsubscribeLiveTurns = null;
    let matchEnded = false;
    let unsubscribeSurrender = null;
    let timeLeft = TURN_TIME_LIMIT, timerEvent = null;
    let authoritativeTurnEvents = [];
    let authoritativeEventSeq = 0;
    let lastProcessedEventSeq = 0;

    let sfxClick;
    let sfxPools = {};

    function playSfxNow(scene, key, volume) {
      try {
        if (scene.sound?.context?.state === 'suspended') {
          scene.sound.context.resume().catch(() => null);
        }
      } catch {
        // Ignore audio context resume failures.
      }

      const pool = sfxPools[key];
      if (pool && pool.items.length > 0) {
        const chosen = pool.items.find(s => !s.isPlaying);
        if (chosen) {
          try {
            chosen.setVolume(volume ?? pool.volume);
            chosen.play();
            return;
          } catch {
            // Ignore per-sound play errors.
          }
        }

        // Pool lotado: cria voz temporaria sem cortar audio em andamento.
        try {
          const extra = scene.sound.add(key, { volume: volume ?? pool.volume });
          extra.once('complete', () => {
            try { extra.destroy(); } catch { /* ignore */ }
          });
          extra.play();
          return;
        } catch {
          // Ignore temporary voice creation failures.
        }
      }
      try {
        scene.sound.play(key, { volume });
      } catch {
        // Ignore fallback play errors.
      }
    }

    function createSfxPool(scene, key, volume, size = 6) {
      const items = [];
      for (let i = 0; i < size; i += 1) {
        try {
          const snd = scene.sound.add(key, { volume });
          items.push(snd);
        } catch {
          // Ignore pool allocation failures.
        }
      }
      return { items, cursor: 0, volume };
    }

    function initCombatSfxPools(scene) {
      sfxPools = {
        shoot: createSfxPool(scene, 'shoot', 0.3, 24),
        explosion: createSfxPool(scene, 'explosion', 0.5, 16),
        crash: createSfxPool(scene, 'crash', 0.6, 8)
      };
    }

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
      scene.add.tileSprite(TOTAL_WIDTH / 2, PLAY_HEIGHT / 2, TOTAL_WIDTH, PLAY_HEIGHT, 'bg').setAlpha(1);

      try {
        sfxClick = scene.sound.add('click', { volume: 0.5 });
      } catch (e) { console.log("Erro de áudio Phaser", e); }
      initCombatSfxPools(scene);

      const hudY = PLAY_HEIGHT;
      const hudBg = scene.add.graphics();
      hudBg.fillStyle(UI_THEME.hud.panelFill, 0.9);
      hudBg.fillRect(0, hudY, TOTAL_WIDTH, HUD_HEIGHT);
      hudBg.lineStyle(2, UI_THEME.hud.panelLine, 0.9);
      hudBg.lineBetween(0, hudY, TOTAL_WIDTH, hudY);
      hudBg.lineStyle(1, UI_THEME.hud.panelGlow, 0.35);
      hudBg.lineBetween(0, hudY + 2, TOTAL_WIDTH, hudY + 2);

      const textX = 20; const startY = PLAY_HEIGHT + 15; const lineHeight = 22;
      turnText = scene.add.text(textX, startY, t('TURN_YOURS'), { font: '700 20px Trebuchet MS', fill: UI_THEME.hud.turnText, stroke: '#04101f', strokeThickness: 4 }).setDepth(100);
      txtName = scene.add.text(textX, startY + 30, t('SELECT_SHIP'), { font: '700 18px Trebuchet MS', fill: UI_THEME.hud.labelText, stroke: '#04101f', strokeThickness: 3 }).setDepth(100);
      txtHP = scene.add.text(textX, startY + 30 + lineHeight, "", { font: '700 14px Consolas', fill: UI_THEME.hud.hpText, stroke: '#04101f', strokeThickness: 2 }).setDepth(100);
      txtSPD = scene.add.text(textX, startY + 30 + (lineHeight * 2), "", { font: '700 14px Consolas', fill: UI_THEME.hud.spdText, stroke: '#04101f', strokeThickness: 2 }).setDepth(100);
      txtDMG = scene.add.text(textX, startY + 30 + (lineHeight * 3), "", { font: '700 14px Consolas', fill: UI_THEME.hud.dmgText, stroke: '#04101f', strokeThickness: 2 }).setDepth(100);
      timerText = scene.add.text(20, 28, `${t('TIMER_LABEL')}${TURN_TIME_LIMIT}`, { font: '700 22px Consolas', fill: UI_THEME.hud.timerText, stroke: '#04101f', strokeThickness: 4 })
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

      // ✅ ASTEROIDE COM HITBOX JUSTO E CENTRALIZADO
      mapData.forEach(pos => {
        const obs = obstacleGroup.create(pos.x, pos.y, 'asteroid_img');
        obs.setScale(0.12);
        obs.refreshBody();

        const radius = obs.displayWidth * 0.31;
        obs.body.setCircle(radius);

        const offsetX = (obs.displayWidth / 2) - radius;
        const offsetY = (obs.displayHeight / 2) - radius;
        obs.body.setOffset(offsetX, offsetY);
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

        const liveTurnsRef = ref(db, `rooms/${roomId}/turnLive`);
        unsubscribeLiveTurns = onValue(liveTurnsRef, (snapshot) => {
          if (matchEnded || isHost) return;
          const liveTurns = snapshot.val();
          if (!liveTurns) return;
          const currentT = turnRefValue.current;
          const turnEvents = liveTurns[currentT];
          if (!turnEvents) return;
          const ordered = Object.values(turnEvents).sort((a, b) => (a?.seq ?? 0) - (b?.seq ?? 0));
          applyAuthoritativeEvents(scene, ordered);
        });
      }

      // ✅ FEEDBACK VISUAL (Texto + Flash) ATIVADO
      scene.physics.add.overlap(projectileGroup, shipsGroup, (projectile, ship) => {
        if (!projectile.active || !ship.active) return;
        if (projectile.ownerNetOwner === ship.netOwner) return;

        if (isTraining || isHost) {
          const boom = scene.add.circle(projectile.x, projectile.y, 15, 0xffaa00);
          scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 150, onComplete: () => boom.destroy() });
          playSfxNow(scene, 'explosion', 0.35);
          projectile.destroy();

          if (!isTraining && isHost && isExecuting) {
            const hitX = ship.body?.center?.x ?? ship.x;
            const hitY = ship.body?.center?.y ?? ship.y;
            emitAuthoritativeEvent(turnRefValue.current, { type: 'HITFX', x: projectile.x, y: projectile.y });
            emitAuthoritativeEvent(turnRefValue.current, { type: 'DMG', target: ship.netId, dmg: projectile.damage, x: hitX, y: hitY });
          }

          const hpBefore = ship.hp;
          takeDamage(scene, ship, projectile.damage, true);
          if (!isTraining && isHost && isExecuting && hpBefore > 0 && ship.hp <= 0) {
            emitAuthoritativeEvent(turnRefValue.current, { type: 'KILL', target: ship.netId, x: ship.x, y: ship.y });
          }
          return;
        }

        // Guest: feedback visual imediato, sem aplicar dano local.
        const boom = scene.add.circle(projectile.x, projectile.y, 15, 0xffaa00);
        scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 150, onComplete: () => boom.destroy() });
        playSfxNow(scene, 'explosion', 0.35);
        showPendingHitFX(scene, ship);
        projectile.destroy();
        return;
      });

      scene.physics.add.collider(projectileGroup, obstacleGroup, (projectile) => {
        const boom = scene.add.circle(projectile.x, projectile.y, 10, 0xaaaaaa);
        scene.tweens.add({ targets: boom, scale: 1.5, alpha: 0, duration: 100, onComplete: () => boom.destroy() });
        projectile.destroy();
      });

      // ✅ FEEDBACK VISUAL DE COLISÃO ATIVADO
      scene.physics.add.overlap(shipsGroup, shipsGroup, (a, b) => {
        if (a === b) return;
        if (!a.active || !b.active) return;
        if (a.netOwner === b.netOwner) return;
        if (!isExecuting) return;
        if (a.hasCrashed || b.hasCrashed) return;
        if (String(a.netId) > String(b.netId)) return;

        if (isTraining || isHost) {
          scene.cameras.main.shake(100, 0.01);
          playSfxNow(scene, 'crash', 0.6);

          a.hasCrashed = true; b.hasCrashed = true;
          const crashX = (a.x + b.x) / 2;
          const crashY = (a.y + b.y) / 2;
          showFloatText(scene, crashX, crashY, t('CRASH_LABEL'), '#ffaa00');

          if (!isTraining && isHost) {
            const ax = a.body?.center?.x ?? a.x;
            const ay = a.body?.center?.y ?? a.y;
            const bx = b.body?.center?.x ?? b.x;
            const by = b.body?.center?.y ?? b.y;
            emitAuthoritativeEvent(turnRefValue.current, { type: 'CRASHFX', x: crashX, y: crashY });
            emitAuthoritativeEvent(turnRefValue.current, { type: 'DMG', target: a.netId, dmg: 20, x: ax, y: ay });
            emitAuthoritativeEvent(turnRefValue.current, { type: 'DMG', target: b.netId, dmg: 20, x: bx, y: by });
          }

          const hpBeforeA = a.hp;
          const hpBeforeB = b.hp;
          takeDamage(scene, a, 20, true);
          takeDamage(scene, b, 20, true);
          if (!isTraining && isHost && isExecuting && hpBeforeA > 0 && a.hp <= 0) {
            emitAuthoritativeEvent(turnRefValue.current, { type: 'KILL', target: a.netId, x: a.x, y: a.y });
          }
          if (!isTraining && isHost && isExecuting && hpBeforeB > 0 && b.hp <= 0) {
            emitAuthoritativeEvent(turnRefValue.current, { type: 'KILL', target: b.netId, x: b.x, y: b.y });
          }
          return;
        }

        // Guest: feedback visual imediato, sem aplicar dano local.
        scene.cameras.main.shake(100, 0.01);
        playSfxNow(scene, 'crash', 0.6);
        a.hasCrashed = true;
        b.hasCrashed = true;
        showPendingHitFX(scene, a);
        showPendingHitFX(scene, b);
        showFloatText(scene, (a.x + b.x) / 2, (a.y + b.y) / 2, t('CRASH_LABEL'), '#ffaa00');
        return;
      });

      const centerY = PLAY_HEIGHT + (HUD_HEIGHT / 2);
      createButton(scene, TOTAL_WIDTH - 120, centerY, t('BTN_EXECUTE'), 160, 60, { variant: 'green' }, () => {
        if (!isExecuting) {
          if (sfxClick) sfxClick.play();
          submitTurn(scene);
        }
      }, staticHudGroup);

      moveHandle = scene.add.circle(0, 0, 10, 0x00ff00).setStrokeStyle(3, 0x000000).setDepth(300).setVisible(false).setInteractive({ draggable: true });
      attackHandle = scene.add.circle(0, 0, 10, WEAPONS.CANNON.color).setStrokeStyle(3, 0x000000).setDepth(300).setVisible(false).setInteractive({ draggable: true });

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
          attackHandle.setFillStyle(selectedShip.weapon.color);
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
      timerText.setColor(UI_THEME.hud.timerText);

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
            if (timeLeft <= 10) timerText.setColor(UI_THEME.hud.timerDanger);
            if (timeLeft <= 0) submitTurn(scene);
          }
        }, loop: true
      });
    }

    function stopTimer() {
      if (timerEvent) timerEvent.remove();
      timerText.setText(t('WAITING_LABEL'));
      timerText.setColor(UI_THEME.hud.timerWaiting);
    }

    function spawnShip(scene, x, y, stats, faction, index, netOwner) {
      const ship = scene.physics.add.sprite(x, y, stats.sprite);
      ship.setScale(0.17);

      // ✅ NÃO use angle=180 (Arcade body não gira com sprite)
      // ✅ use flip (não afeta o body)
      if (faction === 'ENEMY') ship.setFlipY(true);

      ship.setCollideWorldBounds(true);

      const r = stats.hitRadius ?? 16;
      ship.body.setCircle(r);

      // ✅ SEMPRE: baseOffset + manualOffset (consistente no multiplayer)
      const baseOffsetX = (ship.displayWidth / 2) - r;
      const baseOffsetY = (ship.displayHeight / 2) - r;
      const manualX = stats.hitOffset?.x ?? 0;
      const manualY = stats.hitOffset?.y ?? 0;

      ship.body.setOffset(baseOffsetX + manualX, baseOffsetY + manualY);

      // força atualizar o body após mexer no offset
      if (ship.body.updateFromGameObject) ship.body.updateFromGameObject();

      ship.stats = stats;
      ship.hp = stats.hp;
      ship.predictedHp = null;

      ship.faction = faction;
      ship.squadIndex = index;

      ship.netOwner = netOwner;
      ship.netId = `${netOwner}_${index}`;

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

    function findShipByNetId(netId) {
      return [...playerSquad, ...enemySquad].find(s => s.netId === netId);
    }

    function emitAuthoritativeEvent(turnNumber, payload) {
      if (isTraining || !isHost) return;
      authoritativeEventSeq += 1;
      const ev = { ...payload, seq: authoritativeEventSeq };
      authoritativeTurnEvents.push(ev);
      set(ref(db, `rooms/${roomId}/turnLive/${turnNumber}/${authoritativeEventSeq}`), ev).catch(() => { });
    }

    function applyAuthoritativeEvents(scene, events) {
      if (!Array.isArray(events)) return;

      events.forEach((ev) => {
        if (!ev) return;
        if (ev.seq && ev.seq <= lastProcessedEventSeq) return;
        if (ev.seq) lastProcessedEventSeq = ev.seq;

        if (ev.type === 'HITFX') {
          const boom = scene.add.circle(ev.x, ev.y, 15, 0xffaa00);
          scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 150, onComplete: () => boom.destroy() });
          return;
        }

        if (ev.type === 'CRASHFX') {
          scene.cameras.main.shake(100, 0.01);
          showFloatText(scene, ev.x, ev.y, t('CRASH_LABEL'), '#ffaa00');
          return;
        }

        if (ev.type === 'DMG') {
          const ship = findShipByNetId(ev.target);
          if (!ship) return;
          ship.pendingHit = false;
          ship.setTint(0xff0000);
          scene.time.delayedCall(90, () => { if (ship.active) ship.clearTint(); });
          showFloatText(scene, ship.x, ship.y - 40, `-${ev.dmg}`, '#ff0000');
          return;
        }

        if (ev.type === 'KILL') {
          const ship = findShipByNetId(ev.target);
          if (!ship || !ship.active) return;
          playSfxNow(scene, 'explosion', 0.5);
          const boom = scene.add.circle(ev.x ?? ship.x, ev.y ?? ship.y, 50, 0xffffff);
          scene.tweens.add({ targets: boom, scale: 3, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
          ship.body.enable = false;
          ship.setActive(false).setVisible(false);
          if (selectedShip === ship) deselectAll();
        }
      });
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

    function buildCurrentHpState() {
      const hpState = {};
      [...playerSquad, ...enemySquad].forEach((ship) => {
        hpState[ship.netId] = ship.hp;
      });
      return hpState;
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
      try {
        if (scene.sound?.context?.state === 'suspended') {
          await scene.sound.context.resume();
        }
      } catch {
        // Ignore audio context resume failures.
      }
      try {
        isExecuting = true;
        isWaiting = true;
        turnText.setText(t('EXECUTING_LABEL'));
        stopTimer();

        clearPredictions();
        authoritativeTurnEvents = [];
        authoritativeEventSeq = 0;
        lastProcessedEventSeq = 0;
        if (selectedShip) deselectAll();
        uiGroup.setVisible(false);

        [...playerSquad, ...enemySquad].forEach(s => s.hasCrashed = false);

        const myData = isHost ? turnData.host : turnData.guest;
        const enemyData = isHost ? turnData.guest : turnData.host;

        playerSquad.forEach(s => {
          const plan = myData.find(p => p.index === s.squadIndex);
          if (plan) {
            if (plan.move) s.plannedMove = plan.move;
            if (plan.attack) {
              const wid = plan.attack.weapon || 'CANNON';
              s.weapon = WEAPONS[wid] || WEAPONS.CANNON;
              s.plannedAttack = { x: plan.attack.x, y: plan.attack.y };
            }
          }
        });

        enemySquad.forEach(s => {
          const plan = enemyData.find(p => p.index === s.squadIndex);
          if (plan) {
            if (plan.move) s.plannedMove = plan.move;
            if (plan.attack) {
              const wid = plan.attack.weapon || 'CANNON';
              s.weapon = WEAPONS[wid] || WEAPONS.CANNON;
              s.plannedAttack = { x: plan.attack.x, y: plan.attack.y };
            }
          }
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

        let hostResult = null;
        await new Promise(r => setTimeout(r, 2500));

        if (!isTraining) {
          const currentT = turnRefValue.current;
          if (isHost) {
            await set(ref(db, `rooms/${roomId}/turnLive/${currentT}`), null);
            lastProcessedEventSeq = authoritativeEventSeq;
            hostResult = { hpState: buildCurrentHpState(), events: authoritativeTurnEvents, at: Date.now() };
            await set(ref(db, `rooms/${roomId}/turnResults/${currentT}`), hostResult);
            applyHpState(hostResult.hpState);
          } else {
            const data = await waitTurnResult(roomId, currentT);
            applyAuthoritativeEvents(scene, data?.events);
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
      } catch (err) {
        isExecuting = false;
        isWaiting = false;
        uiGroup.setVisible(true);
        turnText.setText(`${t('STATUS_ERROR')} sync`);
        startTimer(scene);
        console.error('Turn resolution sync error:', err);
      }
    }

    function checkWinCondition() {
      const playerAlive = playerSquad.some(s => s.active);
      const enemyAlive = enemySquad.some(s => s.active);

      if (!playerAlive && !enemyAlive) { gameRef.current.destroy(true); onGameOver('DRAW'); }
      else if (!playerAlive) { gameRef.current.destroy(true); onGameOver('DEFEAT'); }
      else if (!enemyAlive) { gameRef.current.destroy(true); onGameOver('VICTORY'); }
    }

    function getHitboxCenter(ship) {
      if (!ship.body) return { x: ship.x, y: ship.y };
      return { x: ship.body.center.x, y: ship.body.center.y };
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
      playSfxNow(scene, 'shoot', 0.3);
      const weapon = shooter.weapon;
      const baseAngle = Phaser.Math.Angle.Between(shooter.x, shooter.y, tx, ty);

      function getLifetimeToMapEdgeMs(sx, sy, vx, vy) {
        const candidates = [];

        if (vx > 0) candidates.push((TOTAL_WIDTH - sx) / vx);
        else if (vx < 0) candidates.push((0 - sx) / vx);

        if (vy > 0) candidates.push((PLAY_HEIGHT - sy) / vy);
        else if (vy < 0) candidates.push((0 - sy) / vy);

        const positive = candidates.filter(t => Number.isFinite(t) && t > 0);
        if (!positive.length) return 2200;

        return Math.max(200, Math.ceil(Math.min(...positive) * 1000) + 80);
      }

      const spawnBullet = (angleOffset) => {
        const angle = baseAngle + angleOffset;
        const sx = shooter.x + Math.cos(angle) * 45;
        const sy = shooter.y + Math.sin(angle) * 45;

        const proj = scene.add.circle(sx, sy, weapon.radius, weapon.color);
        scene.physics.add.existing(proj);
        projectileGroup.add(proj);

        proj.owner = shooter;
        proj.ownerNetOwner = shooter.netOwner;
        proj.damage = weapon.damage;

        // ✅ raio real usado no Phaser (host usa o mesmo: weapon.radius + 8)
        proj.body.setCircle(weapon.radius + 8);
        proj.body.setOffset(-8, -8);

        const velocityX = Math.cos(angle) * weapon.speed;
        const velocityY = Math.sin(angle) * weapon.speed;
        proj.body.setVelocity(velocityX, velocityY);

        const ttl = getLifetimeToMapEdgeMs(sx, sy, velocityX, velocityY);
        scene.time.delayedCall(ttl, () => { if (proj.active) proj.destroy(); });
      };

      if (weapon.type === 'SINGLE') spawnBullet(0);
      else if (weapon.type === 'SPREAD') { spawnBullet(0); spawnBullet(-0.2); spawnBullet(0.2); }
    }

    function moveShip(scene, ship, tx, ty) {
      const dist = Phaser.Math.Distance.Between(ship.x, ship.y, tx, ty);
      const duration = (dist / ship.stats.speed) * 1000;
      scene.tweens.add({ targets: ship, x: tx, y: ty, duration: duration, ease: 'Quad.easeInOut' });
    }

    function takeDamage(scene, ship, dmg, allowKill) {
      ship.hp -= dmg;
      ship.pendingHit = false;
      showFloatText(scene, ship.x, ship.y - 40, `-${dmg}`, '#ff0000');
      if (ship.hp <= 0 && allowKill) {
        playSfxNow(scene, 'explosion', 0.5);
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

    function showPendingHitFX(scene, ship) {
      if (!ship || !ship.active) return;
      ship.pendingHit = true;
      ship.pendingHitUntil = Date.now() + 400;

      const smoke = scene.add.circle(ship.x, ship.y, 16, 0x999999, 0.35);
      scene.tweens.add({
        targets: smoke,
        x: ship.x + Phaser.Math.Between(-12, 12),
        y: ship.y + Phaser.Math.Between(-14, -6),
        scale: 1.8,
        alpha: 0,
        duration: 350,
        onComplete: () => smoke.destroy()
      });
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
      const txt = scene.add.text(x, y, text, { font: '20px monospace', fill: color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(200);
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
      createButton(scene, TOTAL_WIDTH - 420, centerY, "1. CANNON", 130, 50, { variant: 'purple', dim: selectedShip.weapon.id !== 'CANNON' }, () => { selectedShip.weapon = WEAPONS.CANNON; updateHandles(); drawUI(scene); updateHUDInfo(); }, uiGroup);
      createButton(scene, TOTAL_WIDTH - 280, centerY, "2. FLAK", 130, 50, { variant: 'orange', dim: selectedShip.weapon.id !== 'FLAK' }, () => { selectedShip.weapon = WEAPONS.FLAK; updateHandles(); drawUI(scene); updateHUDInfo(); }, uiGroup);
      let cancelX = 250;
      if (selectedShip.plannedMove) { createButton(scene, cancelX, centerY, t('BTN_MOVE'), 100, 40, { variant: 'red' }, () => { selectedShip.plannedMove = null; updateHandles(); drawUI(scene); }, uiGroup); cancelX += 110; }
      if (selectedShip.plannedAttack) { createButton(scene, cancelX, centerY, t('BTN_ATK'), 100, 40, { variant: 'red' }, () => { selectedShip.plannedAttack = null; updateHandles(); drawUI(scene); }, uiGroup); }
    }

    function createButton(scene, x, y, text, w, h, buttonStyle, callback, targetGroup) {
      const variantKey = (typeof buttonStyle === 'object' && buttonStyle?.variant) ? buttonStyle.variant : null;
      const variant = variantKey ? (UI_THEME.button[variantKey] || UI_THEME.button.purple) : null;
      const fallbackFill = (typeof buttonStyle === 'number') ? buttonStyle : UI_THEME.button.purple.fill;
      const fill = variant?.fill ?? fallbackFill;
      const innerFill = variant?.inner ?? 0x102745;
      const stroke = variant?.stroke ?? 0x4ba8ff;
      const glow = variant?.glow ?? 0x2a9dff;
      const textColor = variant?.text ?? UI_THEME.button.baseText;
      const isDim = Boolean(buttonStyle?.dim);
      const dimAlpha = isDim ? 0.55 : 1;

      const container = scene.add.container(x, y);
      const outerGlow = scene.add.rectangle(0, 0, w + 12, h + 12, glow, 0.22 * dimAlpha).setStrokeStyle(1, glow, 0.45 * dimAlpha);
      const shell = scene.add.rectangle(0, 0, w, h, fill, (isDim ? 0.78 : 0.92)).setStrokeStyle(2, stroke, 1 * dimAlpha);
      const inner = scene.add.rectangle(0, 0, w - 8, h - 8, innerFill, (isDim ? 0.75 : 0.9)).setStrokeStyle(1, stroke, 0.45 * dimAlpha);
      const sheen = scene.add.rectangle(0, -(h * 0.22), w - 16, 8, 0xffffff, isDim ? 0.1 : 0.2);
      const label = scene.add.text(0, 0, text, {
        fontSize: '18px',
        fontStyle: '700',
        fontFamily: 'Trebuchet MS',
        align: 'center',
        color: textColor,
        stroke: '#04101f',
        strokeThickness: 3
      }).setOrigin(0.5);
      label.setAlpha(isDim ? 0.82 : 1);

      shell.setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => {
          container.setScale(1.02);
          outerGlow.setAlpha((isDim ? 0.22 : 0.34));
          shell.setStrokeStyle(2, stroke, 1);
        })
        .on('pointerout', () => {
          container.setScale(1);
          outerGlow.setAlpha(0.22 * dimAlpha);
          shell.setStrokeStyle(2, stroke, 1);
        })
        .on('pointerdown', () => {
          container.setScale(0.98);
          outerGlow.setAlpha(0.34);
        })
        .on('pointerup', () => {
          container.setScale(1.02);
          outerGlow.setAlpha(0.28);
        });

      container.add([outerGlow, shell, inner, sheen, label]);
      if (targetGroup) targetGroup.add(container);
      return container;
    }

    function updateHandles() {
      if (!selectedShip) return;
      if (selectedShip.plannedMove) { moveHandle.setPosition(selectedShip.plannedMove.x, selectedShip.plannedMove.y); moveHandle.setVisible(true); moveHandle.setFillStyle(0x00ff00); } else { moveHandle.setVisible(false); }
      if (selectedShip.plannedAttack) { attackHandle.setPosition(selectedShip.plannedAttack.x, selectedShip.plannedAttack.y); attackHandle.setVisible(true); attackHandle.setFillStyle(selectedShip.weapon.color); } else { attackHandle.setVisible(false); }
    }

    function update() {
      graphics.clear();
      if (isExecuting) {
        moveHandle.setVisible(false);
        attackHandle.setVisible(false);
        [...playerSquad, ...enemySquad].forEach(ship => { if (ship.active) drawHP(ship); });
        return;
      }

      const renderPendingHit = (ship) => {
        if (!ship.pendingHit) return;
        const until = ship.pendingHitUntil || 0;
        if (Date.now() >= until) {
          ship.pendingHit = false;
          if (ship.active) ship.clearTint();
          return;
        }
        if (Math.floor(Date.now() / 80) % 2 === 0) ship.setTintFill(0xffffff);
        else ship.clearTint();
      };

      [...playerSquad].forEach(ship => {
        if (!ship.active) return;
        drawHP(ship);
        renderPendingHit(ship);

        if (ship.plannedMove) {
          graphics.lineStyle(2, 0x00ff00, 0.8);
          graphics.lineBetween(ship.x, ship.y, ship.plannedMove.x, ship.plannedMove.y);
        }

        if (ship.plannedAttack) {
          graphics.lineStyle(2, ship.weapon.color, 0.85);
          graphics.lineBetween(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);

          if (ship.weapon.type === 'SPREAD') {
            const angle = Phaser.Math.Angle.Between(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);
            const dist = Phaser.Math.Distance.Between(ship.x, ship.y, ship.plannedAttack.x, ship.plannedAttack.y);
            const p1 = { x: ship.x + Math.cos(angle - 0.2) * dist, y: ship.y + Math.sin(angle - 0.2) * dist };
            const p2 = { x: ship.x + Math.cos(angle + 0.2) * dist, y: ship.y + Math.sin(angle + 0.2) * dist };
            graphics.lineStyle(1, ship.weapon.color, 0.35);
            graphics.lineBetween(ship.x, ship.y, p1.x, p1.y);
            graphics.lineBetween(ship.x, ship.y, p2.x, p2.y);
          }
        }

        if (ship.isSelected) {
          const c = getHitboxCenter(ship);
          const pulse = Math.sin(Date.now() / 180) * 2;
          const selectionRingRadius = 150;

          // Selection ring: visual feedback only (not gameplay collision)
          graphics.lineStyle(2, 0xe8f7ff, 0.95);
          graphics.strokeCircle(c.x, c.y, selectionRingRadius + pulse);

          // Move range
          graphics.lineStyle(1, 0x00ff88, 0.22);
          graphics.strokeCircle(c.x, c.y, ship.stats.moveRange);
        }
      });

      [...enemySquad].forEach(ship => {
        if (!ship.active) return;
        drawHP(ship);
        renderPendingHit(ship);
      });
    }

    return () => {
      if (unsubscribeTurns) unsubscribeTurns();
      if (unsubscribeLiveTurns) unsubscribeLiveTurns();
      if (unsubscribeSurrender) unsubscribeSurrender();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [roomId, isHost, isTraining]);

  return <div id="phaser-container" />;
};

