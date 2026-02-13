import React from 'react';
import { AUDIO_UI } from '../game/constants';

const styles = {
  musicDockRow: { position: 'absolute', top: 'calc(50% - 442px)', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none' },
  musicDock: { position: 'relative', width: 306, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  musicDockBg: { width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 0 8px rgba(44, 178, 255, 0.22))', pointerEvents: 'none' },
  musicDockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, paddingLeft: 10, paddingRight: 10, pointerEvents: 'none' },
  audioIconBtn: { border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', width: 37, height: 29, display: 'grid', placeItems: 'center', transition: 'transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease', filter: 'drop-shadow(0 0 5px rgba(45,190,255,0.35))', pointerEvents: 'auto' },
  audioIconBtnDisabled: { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(0.2)' },
  audioIconImg: { width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }
};

function AudioIconButton({ src, alt, onClick, title, disabled = false, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(1.06)';
        e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(84, 222, 255, 0.95))';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.filter = style.filter || styles.audioIconBtn.filter;
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(0.94)';
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
      style={{ ...styles.audioIconBtn, ...(disabled ? styles.audioIconBtnDisabled : null), ...style }}
    >
      <img src={src} alt={alt} style={styles.audioIconImg} draggable={false} />
    </button>
  );
}

export default function AudioDock({
  isGlobalMuted,
  isMusicPlaying,
  onPrevTrack,
  onTogglePlay,
  onNextTrack,
  onToggleMute
}) {
  return (
    <div style={styles.musicDockRow}>
      <div style={styles.musicDock}>
        <img src={AUDIO_UI.backgroundplayer} alt="Audio dock" style={styles.musicDockBg} draggable={false} />
        <div style={styles.musicDockOverlay}>
          <AudioIconButton
            src={AUDIO_UI.previous}
            alt="Previous"
            onClick={onPrevTrack}
            title="Previous"
            disabled={isGlobalMuted}
          />
          <AudioIconButton
            src={isMusicPlaying ? AUDIO_UI.pause : AUDIO_UI.play}
            alt={isMusicPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            title={isMusicPlaying ? 'Pause' : 'Play'}
            disabled={isGlobalMuted}
          />
          <AudioIconButton
            src={AUDIO_UI.next}
            alt="Next"
            onClick={onNextTrack}
            title="Next"
            disabled={isGlobalMuted}
          />
          <AudioIconButton
            src={isGlobalMuted ? AUDIO_UI.sound : AUDIO_UI.mute}
            alt={isGlobalMuted ? 'Sound' : 'Mute'}
            onClick={onToggleMute}
            title={isGlobalMuted ? 'Unmute' : 'Mute'}
            style={{ opacity: isGlobalMuted ? 1 : 0.86 }}
          />
        </div>
      </div>
    </div>
  );
}
