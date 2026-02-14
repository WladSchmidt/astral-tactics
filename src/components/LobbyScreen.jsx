import React from 'react';

export default function LobbyScreen({
  t,
  styles,
  playerName,
  setPlayerName,
  joinCode,
  setJoinCode,
  statusMsg,
  onStartTraining,
  onCreateRoom,
  onJoinRoom
}) {
  return (
    <div style={styles.menuBox}>
      <div style={styles.menuContent}>
        <h1 style={styles.title}>{t('MAIN_TITLE')}</h1>
        <p style={{ color: '#00ccff', marginBottom: 30, fontSize: '1.2rem', textShadow: '0 0 10px #00ccff' }}>{t('MAIN_SUBTITLE')}</p>
        <div style={{ width: '100%', maxWidth: 420, marginBottom: 18 }}>
          <h3 style={{ color: '#fff', margin: '0 0 8px 0', textAlign: 'center' }}>{t('PLAYER_NAME_LABEL')}</h3>
          <input
            type="text"
            maxLength={18}
            style={{ ...styles.input, letterSpacing: 1, textTransform: 'none', fontSize: 20, marginBottom: 0 }}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={t('PLAYER_NAME_PLACEHOLDER')}
          />
        </div>
        <button style={{ ...styles.btn, background: '#444', width: '100%', marginBottom: 30, border: '1px solid #666' }} onClick={onStartTraining}>{t('BTN_TRAINING')}</button>
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={styles.lobbyBox}>
            <h3 style={{ color: '#fff' }}>{t('HOST_TITLE')}</h3>
            <button style={styles.btn} onClick={onCreateRoom}>{t('HOST_BTN')}</button>
          </div>
          <div style={styles.lobbyBox}>
            <h3 style={{ color: '#fff' }}>{t('GUEST_TITLE')}</h3>
            <input
              type="text"
              maxLength={4}
              style={styles.input}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('INPUT_PLACEHOLDER')}
            />
            <button style={styles.btn} onClick={onJoinRoom}>{t('GUEST_BTN')}</button>
          </div>
        </div>
        <p style={{ marginTop: 20, color: '#ffaa00', fontSize: 14, fontWeight: 'bold' }}>{statusMsg}</p>
      </div>
    </div>
  );
}
