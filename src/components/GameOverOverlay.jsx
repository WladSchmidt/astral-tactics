import React from 'react';

export default function GameOverOverlay({
  t,
  styles,
  gameResult,
  getResultColor,
  onRestart,
  onBackToMenu,
  isTraining,
  statusMsg
}) {
  return (
    <div style={styles.overlay}>
      <h1 style={{ ...styles.title, color: getResultColor() }}>{t(gameResult)}</h1>
      <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
        <button style={styles.btn} onClick={onRestart}>{t('BTN_RESTART')}</button>
        <button style={{ ...styles.btn, background: '#444' }} onClick={onBackToMenu}>{t('BTN_MENU')}</button>
      </div>
      {!isTraining && (
        <p style={{ marginTop: 14, color: '#ffaa00', fontWeight: 'bold' }}>{statusMsg}</p>
      )}
    </div>
  );
}
