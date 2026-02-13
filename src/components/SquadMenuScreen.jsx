import React from 'react';
import { SHIP_IMAGES, SHIP_STATS } from '../game/constants';

export default function SquadMenuScreen({
  t,
  styles,
  roomId,
  mySquad,
  statusMsg,
  onAddShip,
  onRemoveShip,
  onLockInSquad
}) {
  return (
    <div style={styles.menuBox}>
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: 8, border: '1px solid #00ccff' }}>
        <span style={{ color: '#888', fontSize: 12 }}>{t('ROOM_LABEL')}</span> <span style={{ color: '#00ccff', fontSize: 20, fontWeight: 'bold' }}>{roomId}</span>
      </div>
      <div style={styles.menuContent}>
        <div style={styles.instructionsBox}><p style={{ margin: 0, color: '#00ccff', fontWeight: 'bold' }}>{t('SELECT_INSTRUCT')}</p></div>
        <div style={styles.cardRow}>
          {Object.values(SHIP_STATS).map((ship) => (
            <div key={ship.id} className="ship-card" style={styles.card} onClick={() => onAddShip(ship.id)}>
              <img src={SHIP_IMAGES[ship.sprite]} alt={ship.name} style={styles.cardImage} />
              <strong style={{ fontSize: '1rem', color: '#fff', display: 'block' }}>{ship.name}</strong>
              <div style={styles.statLine}>HP: {ship.hp} | SPD: {ship.speed}</div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: 5 }}>{t(ship.descKey)}</div>
            </div>
          ))}
        </div>
        <div style={styles.slotsContainer}>
          {mySquad.map((id, idx) => (
            <div key={idx} style={styles.slotActive} onClick={() => onRemoveShip(idx)}>{SHIP_STATS[id].name} ✖</div>
          ))}
        </div>
        <button disabled={mySquad.length !== 3} style={{ ...styles.startBtn, opacity: mySquad.length === 3 ? 1 : 0.5 }} onClick={onLockInSquad}>{t('BTN_READY')}</button>
        <p style={{ marginTop: 10, color: '#ffaa00' }}>{statusMsg}</p>
      </div>
    </div>
  );
}
