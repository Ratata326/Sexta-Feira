
import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

const Visualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, accentColor = '#f97316' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.45;
      const time = Date.now() / 1000;

      // Get audio data
      let average = 0;
      if (isActive && analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        average = sum / bufferLength;
      }
      
      // Audio reactivity factors
      const bass = isActive ? (dataArray[0] || 0) / 255 : 0;
      const mid = isActive ? (dataArray[Math.floor(bufferLength / 2)] || 0) / 255 : 0;
      const globalPulse = 1 + (average / 255) * 0.2;

      ctx.clearRect(0, 0, width, height);

      // Helper for drawing rings
      const drawRing = (radius: number, width: number, color: string, alpha: number, startAngle: number = 0, endAngle: number = Math.PI * 2, dash: number[] = []) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        if (dash.length > 0) ctx.setLineDash(dash);
        ctx.stroke();
        ctx.restore();
      };

      // Helper for filled circles
      const drawCircle = (radius: number, color: string, alpha: number, blur: number = 0) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        if (blur > 0) {
            ctx.shadowBlur = blur;
            ctx.shadowColor = color;
        }
        ctx.fill();
        ctx.restore();
      };

      // 1. Background Glow (Atmosphere)
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 1.5);
      bgGrad.addColorStop(0, isActive ? 'rgba(234, 88, 12, 0.2)' : 'rgba(67, 20, 7, 0.1)'); // Orange-ish
      bgGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (!isActive) {
        // Dormant State - Simple dim rings
        drawRing(maxRadius * 0.3, 2, '#7c2d12', 0.3);
        drawRing(maxRadius * 0.6, 1, '#7c2d12', 0.2, 0, Math.PI * 2, [5, 15]);
        drawCircle(maxRadius * 0.05, '#ea580c', 0.5, 10);
        return;
      }

      // --- ACTIVE STATE: F.R.I.D.A.Y. HUD ---

      // 2. Central Core (The "Eye")
      const coreRadius = maxRadius * 0.15 * (1 + bass * 0.3);
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.2, '#fef08a'); // Yellow-200
      coreGrad.addColorStop(0.5, '#f97316'); // Orange-500
      coreGrad.addColorStop(1, 'transparent');
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 40 * globalPulse;
      ctx.shadowColor = '#ea580c';
      ctx.fill();
      ctx.restore();

      // 3. Inner Tech Rings (Rotating)
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Ring 1: Fast spinner
      ctx.save();
      ctx.rotate(time * 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * 0.25, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fbbf24'; // Amber
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([10, 20]);
      ctx.stroke();
      ctx.restore();

      // Ring 2: Counter-rotating segments
      ctx.save();
      ctx.rotate(-time * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * 0.35, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f97316';
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([40, 60]);
      ctx.stroke();
      ctx.restore();

      // Ring 3: Static-ish thin ring with pulse
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * 0.45 * globalPulse, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#c2410c'; // Darker orange
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.restore();

      // 4. Middle Complex Layer (The thick mechanical parts)
      // Segmented thick ring
      ctx.save();
      ctx.rotate(time * 0.1);
      const segments = 6;
      for (let i = 0; i < segments; i++) {
          ctx.beginPath();
          const start = (i * 2 * Math.PI) / segments;
          const end = start + (Math.PI / segments) * 0.6;
          ctx.arc(0, 0, maxRadius * 0.6, start, end);
          ctx.lineWidth = 8;
          ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)'; // Orange-600
          ctx.stroke();
          
          // Detail on the segment
          ctx.beginPath();
          ctx.arc(0, 0, maxRadius * 0.62, start, end);
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#fdba74'; // Orange-300
          ctx.stroke();
      }
      ctx.restore();

      // 5. Outer Data Ring (Audio Reactive)
      if (analyser) {
          ctx.save();
          ctx.rotate(-time * 0.2);
          const bars = 60;
          const barWidth = (Math.PI * 2) / bars;
          for (let i = 0; i < bars; i++) {
              // Map frequency data to bars
              const dataIndex = Math.floor((i / bars) * bufferLength * 0.5); // Use lower half of freq
              const value = dataArray[dataIndex] / 255;
              const barHeight = value * maxRadius * 0.3;
              
              const angle = i * barWidth;
              const rInner = maxRadius * 0.75;
              const rOuter = rInner + 10 + barHeight;

              ctx.beginPath();
              // Draw radial line
              const x1 = Math.cos(angle) * rInner;
              const y1 = Math.sin(angle) * rInner;
              const x2 = Math.cos(angle) * rOuter;
              const y2 = Math.sin(angle) * rOuter;
              
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              
              ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + value})`; // Amber with dynamic alpha
              ctx.lineWidth = 2;
              ctx.stroke();
          }
          ctx.restore();
      }

      // 6. Outermost Containment Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * 0.95, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#7c2d12';
      ctx.setLineDash([2, 10]);
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      
      // Rotating marker on outer ring
      ctx.rotate(time * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * 0.95, 0, Math.PI * 0.2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f97316';
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // End translation
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isActive]);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
        <canvas
            ref={canvasRef}
            width={1200}
            height={1200}
            className="w-full h-full max-w-[900px] max-h-[900px] z-10"
        />
    </div>
  );
};

export default Visualizer;
