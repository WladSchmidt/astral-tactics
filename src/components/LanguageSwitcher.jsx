import React from 'react';

export default function LanguageSwitcher({ lang, setLang }) {
  return (
    <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 9999, display: 'flex', gap: 5, background: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 5, border: '1px solid #333' }}>
      <button onClick={() => setLang('PT')} style={{ color: lang === 'PT' ? '#00ff00' : '#888', fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>PT</button>
      <div style={{ width: 1, background: '#555' }} />
      <button onClick={() => setLang('EN')} style={{ color: lang === 'EN' ? '#00ff00' : '#888', fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>EN</button>
    </div>
  );
}
