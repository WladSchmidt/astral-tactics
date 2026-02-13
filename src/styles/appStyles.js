import { TOTAL_WIDTH, TOTAL_HEIGHT } from '../game/constants';

const styles = {
  backgroundWrapper: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)' },
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

export default styles;
