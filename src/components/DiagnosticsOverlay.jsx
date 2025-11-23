import { useEffect, useRef, useState } from 'react';

const DiagnosticsOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const frames = useRef([]);

  useEffect(() => {
    const toggle = (event) => {
      if (event.key === 'F12') {
        event.preventDefault();
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let animationFrameId;
    const loop = (time) => {
      frames.current.push(time);
      while (frames.current.length > 0 && frames.current[0] <= time - 1000) {
        frames.current.shift();
      }
      setFps(frames.current.length);
      if (performance && performance.memory) {
        const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
        setMemoryUsage({ used: usedJSHeapSize, total: jsHeapSizeLimit });
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-64 rounded-2xl border border-white/20 bg-black/70 p-4 text-xs text-white/80 shadow-xl backdrop-blur">
      <p className="font-semibold uppercase tracking-[0.35em] text-white/60">Diagnostics</p>
      <div className="mt-3 space-y-1">
        <p>
          FPS: <span className="font-mono">{fps}</span>
        </p>
        {memoryUsage ? (
          <p>
            Memory: <span className="font-mono">{(memoryUsage.used / 1048576).toFixed(1)}</span> /{' '}
            <span className="font-mono">{(memoryUsage.total / 1048576).toFixed(1)} MB</span>
          </p>
        ) : (
          <p>Memory: unavailable</p>
        )}
      </div>
      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-white/40">
        Toggle with F12
      </p>
    </div>
  );
};

export default DiagnosticsOverlay;
