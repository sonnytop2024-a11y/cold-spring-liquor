"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const PRIZES = [
  { label: "$5 Credit", color: "#FF6B1A", probability: 0.15 },
  { label: "10% Off", color: "#9333EA", probability: 0.2 },
  { label: "15% Off", color: "#2563EB", probability: 0.15 },
  { label: "Free Gift", color: "#16A34A", probability: 0.05 },
  { label: "2x Points", color: "#D97706", probability: 0.2 },
  { label: "Free Opener", color: "#DC2626", probability: 0.1 },
  { label: "5% Off", color: "#0891B2", probability: 0.15 },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;
const SPIN_KEY = "csl_spin_week";

function getWeekKey() {
  const d = new Date();
  const week = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
  return `${week}`;
}

export function SpinToWin() {
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [prize, setPrize] = useState<string | null>(null);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SPIN_KEY);
    if (stored === getWeekKey()) {
      setAlreadySpun(true);
      return;
    }
    // Show popup after 8 seconds on first visit
    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    drawWheel(angle);
  }, [angle]);

  function drawWheel(currentAngle: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    PRIZES.forEach((prize, i) => {
      const start = ((i * SEGMENT_ANGLE - 90 + currentAngle) * Math.PI) / 180;
      const end = (((i + 1) * SEGMENT_ANGLE - 90 + currentAngle) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((start + end) / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText(prize.label, radius - 12, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + radius + 6, cy);
    ctx.lineTo(cx + radius + 24, cy - 10);
    ctx.lineTo(cx + radius + 24, cy + 10);
    ctx.closePath();
    ctx.fillStyle = "#FF6B1A";
    ctx.fill();
  }

  function spin() {
    if (spinning || alreadySpun) return;
    setSpinning(true);
    setPrize(null);

    // Pick prize
    const rand = Math.random();
    let cumulative = 0;
    let prizeIndex = 0;
    for (let i = 0; i < PRIZES.length; i++) {
      cumulative += PRIZES[i].probability;
      if (rand <= cumulative) {
        prizeIndex = i;
        break;
      }
    }

    const targetAngle = 360 * 8 + (360 - prizeIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    const start = performance.now();
    const duration = 5000;
    const startAngle = angle % 360;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startAngle + (targetAngle - startAngle) * eased;
      setAngle(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setPrize(PRIZES[prizeIndex].label);
        localStorage.setItem(SPIN_KEY, getWeekKey());
        setAlreadySpun(true);
      }
    }
    requestAnimationFrame(animate);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="text-3xl mb-2">🎡</div>
        <h2 className="font-heading text-2xl font-bold mb-1">Spin To Win!</h2>
        <p className="text-sm text-gray-500 mb-4">
          {alreadySpun
            ? "You already spun this week. Come back next week!"
            : "Spin once a week for a chance to win exclusive rewards!"}
        </p>

        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="rounded-full"
          />
        </div>

        {prize ? (
          <div className="mt-4 bg-brand-50 border-2 border-brand-300 rounded-xl p-4">
            <p className="font-bold text-xl text-brand-700">🎉 You won: {prize}!</p>
            <p className="text-xs text-gray-500 mt-1">
              Your reward has been added to your account.
            </p>
          </div>
        ) : (
          <button
            onClick={spin}
            disabled={spinning || alreadySpun}
            className="mt-4 w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {spinning ? "Spinning..." : alreadySpun ? "Already Spun This Week" : "SPIN NOW!"}
          </button>
        )}

        <p className="text-xs text-gray-400 mt-3">One spin per week per account</p>
      </div>
    </div>
  );
}
