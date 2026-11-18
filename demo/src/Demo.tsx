import {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import * as THREE from 'three';
import timing from '../public/timing.json';

const GOLD = '#ffb547', PINK = '#ff5fc8', CYAN = '#56e3ff', INK = '#07060d';
const L = timing.lines.map((l) => l.start);
const S = {drop: L[1] - 0.2, chapters: L[2] - 0.2, cli: L[3] - 0.2, out: L[4] - 0.2, logo: L[5] - 0.2};
const SANS = '"SF Pro Display", -apple-system, "Helvetica Neue", sans-serif';
const MONO = '"SF Mono", Menlo, monospace';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const p = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- canvas textures
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const glowTex = () => canvasTex(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});
const coverTex = () => canvasTex(512, 704, (g) => {
  const lg = g.createLinearGradient(0, 0, 512, 704);
  lg.addColorStop(0, '#2a1458'); lg.addColorStop(1, '#0b2a4a');
  g.fillStyle = lg; g.fillRect(0, 0, 512, 704);
  g.strokeStyle = GOLD; g.lineWidth = 6; g.strokeRect(28, 28, 456, 648);
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(255,181,71,${0.15 + i * 0.07})`; g.lineWidth = 3; g.beginPath();
    for (let x = 60; x <= 452; x += 4) g.lineTo(x, 470 + Math.sin(x / 30 + i) * (10 + i * 4) - i * 6);
    g.stroke();
  }
  g.fillStyle = '#fff3dc'; g.textAlign = 'center';
  g.font = 'bold 64px Georgia'; g.fillText('The', 256, 190); g.fillText('Lighthouse', 256, 262); g.fillText('at Dusk', 256, 334);
  g.font = '28px Georgia'; g.fillStyle = GOLD; g.fillText('A NOVEL', 256, 620);
});
const fileTex = (label: string, color: string) => canvasTex(256, 330, (g) => {
  g.fillStyle = '#f6f2ea'; g.beginPath(); g.moveTo(0, 0); g.lineTo(196, 0); g.lineTo(256, 60); g.lineTo(256, 330); g.lineTo(0, 330); g.fill();
  g.fillStyle = '#d6cfc2'; g.beginPath(); g.moveTo(196, 0); g.lineTo(196, 60); g.lineTo(256, 60); g.fill();
  g.fillStyle = '#c9c2b5';
  for (let y = 90; y < 220; y += 22) g.fillRect(28, y, 150 + ((y * 37) % 50), 9);
  g.fillStyle = color; g.fillRect(0, 238, 256, 70);
  g.fillStyle = '#fff'; g.font = 'bold 48px Helvetica'; g.textAlign = 'center'; g.fillText(label, 128, 290);
});

// ---------- 3D scene
const N = 420;
const Scene = ({t, level, bins}: {t: number; level: number; bins: number[]}) => {
  const tex = useMemo(() => ({glow: glowTex(), cover: coverTex(), pdf: fileTex('PDF', '#e5484d'), epub: fileTex('EPUB', '#3e8bff')}), []);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const a = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      a[i * 3] = (random(`sx${i}`) - 0.5) * 30; a[i * 3 + 1] = (random(`sy${i}`) - 0.5) * 18; a[i * 3 + 2] = -6 - random(`sz${i}`) * 10;
    }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);

  // orb path: appears out of the book, sits left during chapters/cli/out, centre for logo
  const orbIn = p(t, 1.9, 3.0);
  const orbX = mix(mix(0, -2.35, p(t, S.chapters, S.chapters + 0.9)), 0, p(t, S.logo, S.logo + 1.0));
  const orbY = mix(0, 0.95, p(t, S.logo, S.logo + 1.0));
  const flash = Math.max(0, 1 - Math.abs(t - (S.drop + 1.45)) * 3) + Math.max(0, 1 - Math.abs(t - (S.drop + 2.05)) * 3);
  const orbScale = orbIn * (1 + level * 0.35 + flash * 0.25) * mix(1, 0.62, p(t, S.logo, S.logo + 1.0));

  // book: spins in, opens, light pours out, then shrinks away
  const bookIn = p(t, 0, 0.8), bookOut = p(t, 2.6, 3.4);
  const open = p(t, 1.3, 2.5) * 2.1;
  const bookScale = bookIn * (1 - bookOut);

  // particles
  const pos = geom.attributes.position.array as Float32Array, col = geom.attributes.color.array as Float32Array;
  const cGold = new THREE.Color(GOLD), cCyan = new THREE.Color(CYAN), cPink = new THREE.Color(PINK);
  for (let i = 0; i < N; i++) {
    const r1 = random(`a${i}`), r2 = random(`b${i}`), r3 = random(`c${i}`);
    let x = 0, y = -50, z = 0;
    if (t < S.chapters) { // burst out of the open pages into the orb
      const k = p(t, 1.8 + r1 * 0.9, 2.9 + r1 * 0.9);
      if (k > 0 && k < 1) {
        const sx = 0.05 + (r2 - 0.5) * 1.3, sy = (r3 - 0.5) * 1.9;
        const ang = r1 * 12 + k * 4;
        x = mix(sx, Math.cos(ang) * 0.2, k); y = mix(sy, Math.sin(ang) * 0.2, k) + Math.sin(k * Math.PI) * (r2 - 0.3) * 1.5;
        z = mix(0.3, 0, k) + Math.sin(k * Math.PI) * 1.2 * r3;
      }
    } else if (t < S.out) { // stream of "text" from the orb towards the panel on the right
      const k = ((t - S.chapters) * 0.35 + r1) % 1;
      const on = p(t, S.chapters + 0.6, S.chapters + 1.4) * (1 - p(t, S.out - 0.6, S.out));
      if (on > 0.02) {
        x = mix(orbX + 0.5, 4.5, k); y = orbY + Math.sin(k * 6 + r2 * 6) * 0.35 * (1 - k) + (r3 - 0.5) * 2.2 * k;
        z = (r2 - 0.5) * 0.8;
      }
    } else { // orbiting dust
      const a = r1 * Math.PI * 2 + t * (0.3 + r2 * 0.4), rad = 1.9 + r3 * 1.6;
      const on = p(t, S.out, S.out + 1);
      x = orbX + Math.cos(a) * rad * on; y = orbY + Math.sin(a) * rad * 0.55 * on; z = Math.sin(a) * rad * 0.45;
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const c = r2 < 0.55 ? cGold : r2 < 0.8 ? cPink : cCyan;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geom.attributes.position.needsUpdate = true; geom.attributes.color.needsUpdate = true;

  // waveform ring
  const ringOn = p(t, S.cli + 0.5, S.cli + 1.5);
  const ringR = mix(0.95, 1.25, p(t, S.out, S.out + 1));
  const BARS = 72;

  // falling files
  const fileAt = (start: number, fromX: number) => {
    const k = p(t, start, start + 1.4);
    const x = mix(fromX, orbX, k), y = mix(3.4, orbY, k) + Math.sin(k * Math.PI) * 0.6;
    const s = (k <= 0 || k >= 1) ? 0 : 1 - Math.pow(k, 4);
    return {x, y, s, rot: (1 - k) * 1.4 * Math.sign(fromX)};
  };
  const f1 = fileAt(S.drop + 0.05, -2.6), f2 = fileAt(S.drop + 0.65, 2.6);

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 3, 5]} intensity={60} color="#ffffff" />
      <pointLight position={[orbX, orbY, 1.2]} intensity={orbIn * (8 + level * 25)} color={GOLD} />
      <points geometry={stars}>
        <pointsMaterial size={0.05} color="#8a7cff" transparent opacity={0.6} />
      </points>
      <group rotation={[0, Math.sin(t * 0.25) * 0.12, 0]}>
        {/* book */}
        <group position={[mix(0, -1.5, bookOut), mix(0, -1.6, bookOut), 0]} scale={bookScale * 1.15}
          rotation={[0.18 - open * 0.04, mix(Math.PI * 1.2, -0.38, bookIn) + Math.sin(t * 0.9) * 0.05, 0.05]}>
          <mesh position={[0, 0, -0.16]}><boxGeometry args={[1.6, 2.2, 0.06]} /><meshStandardMaterial color="#1d1240" roughness={0.6} /></mesh>
          <mesh position={[0.03, 0, 0]}><boxGeometry args={[1.5, 2.1, 0.26]} />
            <meshStandardMaterial color="#f4ead6" emissive={GOLD} emissiveIntensity={p(t, 1.5, 2.4) * 1.6} /></mesh>
          <group position={[-0.8, 0, 0.16]} rotation={[0, -open, 0]}>
            <mesh position={[0.8, 0, 0]}>
              <boxGeometry args={[1.6, 2.2, 0.06]} />
              {[0, 1, 2, 3].map((i) => <meshStandardMaterial key={i} attach={`material-${i}`} color="#1d1240" />)}
              <meshStandardMaterial attach="material-4" map={tex.cover} roughness={0.5} />
              <meshStandardMaterial attach="material-5" color="#efe3cc" />
            </mesh>
          </group>
          <sprite position={[0.1, 0, 0.5]} scale={[4 * p(t, 1.5, 2.3), 4 * p(t, 1.5, 2.3), 1]}>
            <spriteMaterial map={tex.glow} color={GOLD} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>

        {/* falling PDF / EPUB */}
        {[{f: f1, m: tex.pdf}, {f: f2, m: tex.epub}].map(({f, m}, i) => (
          <mesh key={i} position={[f.x, f.y, 0.4]} rotation={[0.2, f.rot, f.rot * 0.4]} scale={f.s}>
            <planeGeometry args={[0.85, 1.1]} />
            <meshBasicMaterial map={m} transparent side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* orb */}
        <group position={[orbX, orbY, 0]} scale={orbScale}>
          <mesh><sphereGeometry args={[0.5, 64, 64]} />
            <meshStandardMaterial color="#2b0f3a" emissive={GOLD} emissiveIntensity={1.4 + level * 2.5} roughness={0.25} metalness={0.2} /></mesh>
          <mesh rotation={[t * 0.4, t * 0.6, 0]}><icosahedronGeometry args={[0.72, 1]} />
            <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.35} /></mesh>
          <mesh rotation={[Math.PI / 2.4, 0, t * 0.8]}><torusGeometry args={[0.86, 0.012, 8, 120]} />
            <meshBasicMaterial color={PINK} transparent opacity={0.8} /></mesh>
          <sprite scale={[3.2 + level * 2, 3.2 + level * 2, 1]}>
            <spriteMaterial map={tex.glow} color={GOLD} transparent opacity={0.75 + flash * 0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          <sprite scale={[6, 6, 1]}>
            <spriteMaterial map={tex.glow} color={PINK} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          {/* audio-reactive ring */}
          {ringOn > 0 && Array.from({length: BARS}).map((_, i) => {
            const a = (i / BARS) * Math.PI * 2;
            const v = bins[1 + ((i < BARS / 2 ? i : BARS - i) % (bins.length - 1))] ?? 0;
            const h = 0.06 + Math.min(1, v * 3.5) * 0.7 * ringOn;
            const c = new THREE.Color().lerpColors(new THREE.Color(GOLD), new THREE.Color(i % 2 ? PINK : CYAN), (Math.sin(a * 2 + t) + 1) / 2);
            return (
              <group key={i} rotation={[0, 0, a]}>
                <mesh position={[0, ringR * ringOn + h / 2, 0]} scale={[1, h, 1]}>
                  <boxGeometry args={[0.035, 1, 0.035]} />
                  <meshBasicMaterial color={c} transparent opacity={ringOn} />
                </mesh>
              </group>
            );
          })}
        </group>

        <points geometry={geom}>
          <pointsMaterial size={0.09} map={tex.glow} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
      </group>
    </>
  );
};

// ---------- 2D overlays
const Fade = ({t, a, b, children, style}: {t: number; a: number; b: number; children: React.ReactNode; style?: React.CSSProperties}) => {
  const k = p(t, a, a + 0.6) * (1 - p(t, b - 0.4, b));
  if (k <= 0) return null;
  return <div style={{position: 'absolute', opacity: k, transform: `translateY(${(1 - k) * 18}px)`, ...style}}>{children}</div>;
};

const VOICE = {narrator: GOLD, mara: PINK, keeper: CYAN};
const CHAPTERS: [string, string, (keyof typeof VOICE)[]][] = [
  ['01', 'The Lamp Room', ['narrator', 'keeper']],
  ['02', 'A Letter From the Mainland', ['narrator', 'mara']],
  ['03', 'Storm Season', ['narrator', 'mara', 'keeper']],
  ['04', 'What the Tide Brought', ['narrator', 'keeper']],
  ['05', 'Morning, Finally', ['narrator', 'mara', 'keeper']],
];

const Chapters = ({t}: {t: number}) => (
  <Fade t={t} a={S.chapters + 0.5} b={S.cli + 0.1} style={{left: 560, top: 120, width: 640}}>
    <div style={{fontFamily: MONO, color: '#9d93c9', fontSize: 16, marginBottom: 14, letterSpacing: 1}}>
      ✓ text cleaned · headers removed · 214 ligatures fixed
    </div>
    {CHAPTERS.map(([n, name, voices], i) => {
      const k = p(t, S.chapters + 0.9 + i * 0.45, S.chapters + 1.5 + i * 0.45);
      return (
        <div key={n} style={{opacity: k, transform: `translateX(${(1 - k) * 60}px)`, display: 'flex', alignItems: 'center',
          gap: 16, padding: '13px 18px', marginBottom: 10, borderRadius: 14, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)'}}>
          <span style={{fontFamily: MONO, color: GOLD, fontSize: 18}}>{n}</span>
          <span style={{fontFamily: SANS, color: '#fff', fontSize: 24, flex: 1}}>{name}</span>
          {voices.map((v) => (
            <span key={v} style={{fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: 1, color: INK,
              background: VOICE[v], borderRadius: 99, padding: '4px 10px', opacity: p(t, S.chapters + 3.6, S.chapters + 4.4)}}>
              {v.toUpperCase()}
            </span>
          ))}
        </div>
      );
    })}
  </Fade>
);

const LINES = [
  {at: 0.0, txt: '$ ./makeaudiobooks convert lighthouse.pdf', c: '#fff'},
  {at: 1.6, txt: 'Model qwen-0.6b · MLX · 100% on-device', c: '#9d93c9'},
  {at: 2.1, txt: '12 chapters · 3 voices · 5.8 h of audio', c: '#9d93c9'},
  {at: 4.6, txt: '✓ 01 The Lamp Room', c: '#7ee787'},
  {at: 5.3, txt: '✓ 02 A Letter From the Mainland', c: '#7ee787'},
  {at: 6.0, txt: '✓ 03 Storm Season', c: '#7ee787'},
];
const Terminal = ({t}: {t: number}) => {
  const lt = t - S.cli - 0.6;
  const prog = p(t, S.cli + 3.0, S.out - 0.3);
  return (
    <Fade t={t} a={S.cli + 0.2} b={S.out + 0.2} style={{left: 520, top: 150, width: 690}}>
      <div style={{borderRadius: 16, overflow: 'hidden', background: 'rgba(14,12,26,0.88)', border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}22`}}>
        <div style={{display: 'flex', gap: 8, padding: '12px 14px', background: 'rgba(255,255,255,0.05)'}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}
        </div>
        <div style={{padding: '18px 22px 24px', fontFamily: MONO, fontSize: 19, lineHeight: 1.75, minHeight: 300}}>
          {LINES.map((l, i) => {
            if (lt < l.at) return null;
            const shown = i === 0 ? l.txt.slice(0, Math.floor((lt - l.at) * 34)) : l.txt;
            return <div key={i} style={{color: l.c}}>{shown}</div>;
          })}
          {lt > 2.6 && (
            <div style={{marginTop: 10, display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{flex: 1, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden'}}>
                <div style={{width: `${prog * 100}%`, height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${PINK})`}} />
              </div>
              <span style={{color: '#fff', fontSize: 16}}>{Math.round(prog * 100)}% · 38 chars/s</span>
            </div>
          )}
        </div>
      </div>
    </Fade>
  );
};

const Player = ({t}: {t: number}) => {
  const k = p(t, S.out + 0.3, S.out + 1.1);
  const play = p(t, S.out + 1.2, S.logo);
  return (
    <Fade t={t} a={S.out + 0.3} b={S.logo + 0.2} style={{left: 640, top: 130, width: 520}}>
      <div style={{transform: `perspective(900px) rotateY(${(1 - k) * -25 - 8}deg) rotateX(4deg)`, borderRadius: 24, padding: 26,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 40px 90px rgba(0,0,0,0.55)', fontFamily: SANS, color: '#fff'}}>
        <div style={{display: 'flex', gap: 22, alignItems: 'center'}}>
          <div style={{width: 120, height: 165, borderRadius: 8, background: 'linear-gradient(135deg,#2a1458,#0b2a4a)', border: `2px solid ${GOLD}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'Georgia', fontWeight: 700,
            fontSize: 17, color: '#fff3dc', boxShadow: `0 0 40px ${GOLD}44`}}>The<br />Lighthouse<br />at Dusk</div>
          <div>
            <div style={{fontSize: 14, letterSpacing: 2, color: GOLD, fontWeight: 700}}>AUDIOBOOK · M4B</div>
            <div style={{fontSize: 30, fontWeight: 700, marginTop: 6}}>The Lighthouse at Dusk</div>
            <div style={{fontSize: 17, color: '#b9b0dd', marginTop: 6}}>12 chapters · 5 h 48 m · cover art</div>
          </div>
        </div>
        <div style={{position: 'relative', marginTop: 28, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)'}}>
          <div style={{width: `${8 + play * 30}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${GOLD}, ${PINK})`}} />
          {[9, 17, 26, 34, 43, 51, 59, 67, 76, 84, 92].map((x) => (
            <div key={x} style={{position: 'absolute', left: `${x}%`, top: -4, width: 2, height: 16, background: 'rgba(255,255,255,0.45)'}} />
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 15, color: '#b9b0dd'}}>
          <span>Chapter 3 · Storm Season</span><span>Ready for Apple Books</span>
        </div>
      </div>
    </Fade>
  );
};

const Logo = ({t}: {t: number}) => (
  <Fade t={t} a={S.logo + 0.4} b={99} style={{left: 0, right: 0, top: 452, textAlign: 'center', fontFamily: SANS, color: '#fff'}}>
    <div style={{fontSize: 76, fontWeight: 800, letterSpacing: -2}}>
      make<span style={{background: `linear-gradient(90deg, ${GOLD}, ${PINK}, ${CYAN})`, WebkitBackgroundClip: 'text', color: 'transparent'}}>audiobooks</span>
    </div>
    <div style={{fontSize: 28, color: '#d8d0ff', marginTop: 4}}>Your library, out loud.</div>
    <div style={{fontFamily: MONO, fontSize: 17, color: '#8f86b8', marginTop: 18}}>free &amp; open source · Qwen3-TTS · runs on your Mac</div>
  </Fade>
);

const Captions = ({t}: {t: number}) => {
  const line = timing.lines.find((l) => t >= l.start - 0.1 && t < l.end + 0.35);
  if (!line || t > S.logo) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 38, textAlign: 'center'}}>
      <span style={{fontFamily: SANS, fontSize: 26, color: '#fff', background: 'rgba(7,6,13,0.6)', padding: '8px 18px', borderRadius: 10}}>
        {line.text.replace(/Make Audiobooks/g, 'makeaudiobooks').replace('Qwen 3', 'Qwen3-TTS')}
      </span>
    </div>
  );
};

export const Demo = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const audio = useAudioData(staticFile('narration.wav'));
  const bins = audio ? visualizeAudio({fps, frame, audioData: audio, numberOfSamples: 32, smoothing: true}) : new Array(32).fill(0);
  const level = Math.min(1, (bins.slice(0, 8).reduce((a, b) => a + b, 0) / 8) * 4);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, #1c1236 0%, #0d0a1c 55%, ${INK} 100%)`}}>
      <Audio src={staticFile('narration.wav')} />
      <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 8], fov: 35}}>
        <Scene t={t} level={level} bins={bins} />
      </ThreeCanvas>
      <Chapters t={t} />
      <Terminal t={t} />
      <Player t={t} />
      <Logo t={t} />
      <Captions t={t} />
    </AbsoluteFill>
  );
};
