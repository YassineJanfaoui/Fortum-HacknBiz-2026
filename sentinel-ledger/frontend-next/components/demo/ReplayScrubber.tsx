import { useDashboardStore } from '@/lib/store';
import { Play, Pause, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export function ReplayScrubber() {
  const { replayVisible, setReplayVisible, activeScenario, replayTimeMs, setReplayTimeMs } = useDashboardStore();
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timeMsRef = useRef<number>(replayTimeMs);

  useEffect(() => {
    timeMsRef.current = replayTimeMs;
  }, [replayTimeMs]);

  const maxTime = activeScenario?.timeline[activeScenario.timeline.length - 1]?.delayMs || 10000;

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = performance.now();
      const loop = (time: number) => {
        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;
        const next = timeMsRef.current + delta;
        if (next >= maxTime) {
          setReplayTimeMs(maxTime);
          setPlaying(false);
        } else {
          setReplayTimeMs(next);
          rafRef.current = requestAnimationFrame(loop);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, maxTime, setReplayTimeMs]);

  if (!replayVisible || !activeScenario) return null;

  // Find the most recent event up to current replayTimeMs
  const currentEvent = [...activeScenario.timeline].reverse().find(t => t.delayMs <= replayTimeMs);
  let eventText = 'System idle';
  if (currentEvent) {
    if (currentEvent.type === 'agent-line') eventText = `${currentEvent.payload.agent}: ${currentEvent.payload.line}`;
    else if (currentEvent.type === 'audit-entry') eventText = `Audit: ${currentEvent.payload.event}`;
    else if (currentEvent.type === 'reason-add') eventText = `Reason added: ${currentEvent.payload}`;
    else eventText = `Action: ${currentEvent.type}`;
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const msStr = Math.floor((ms % 1000) / 100).toString();
    return `00:${s.toString().padStart(2, '0')}.${msStr}`;
  };

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
      border: '1px solid var(--color-border-tertiary)', borderRadius: 8,
      padding: '12px 16px', width: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-neutral" style={{ padding: 6, borderRadius: '50%' }} onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        
        <input 
          type="range" min="0" max={maxTime} value={replayTimeMs}
          onChange={(e) => {
            setReplayTimeMs(Number(e.target.value));
            setPlaying(false);
          }}
          style={{ flex: 1, accentColor: 'var(--color-text-primary)' }}
        />
        
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
          {formatTime(replayTimeMs)} / {formatTime(maxTime)}
        </div>

        <button className="btn" style={{ padding: 4 }} onClick={() => { setReplayVisible(false); setPlaying(false); }}>
          <X size={14} />
        </button>
      </div>
      
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 8 }}>
        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>
          At {formatTime(currentEvent?.delayMs || 0)} —
        </span>
        {eventText}
      </div>
    </div>
  );
}
