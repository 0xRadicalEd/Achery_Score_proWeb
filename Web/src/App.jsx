
import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  RotateCcw,
  Trophy,
  Check,
  MapPin,
  TrendingUp,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  User,
} from "lucide-react";

// ---------- Design tokens ----------
const COLORS = {
  bg: "#182B1D",        // deep field green (background)
  panel: "#22391E",     // slightly lighter panel green
  panelSoft: "#2C4526",
  cream: "#F3ECD9",     // range paper cream
  khaki: "#C7B78E",     // dirt/khaki
  accent: "#FF6A21",    // blaze orange
  accentSoft: "#FFB07A",
  ink: "#16210F",        // near-black text
  miss: "#8B3A3A",
};

const RING_TARGETS = [
  { id: "3-Ring", rings: 3 },
  { id: "4-Ring", rings: 4 },
  { id: "5-Ring", rings: 5 },
  { id: "6-Ring", rings: 6 },
  { id: "7-Ring", rings: 7 },
  { id: "8-Ring", rings: 8 },
  { id: "9-Ring", rings: 9 },
  { id: "10-Ring", rings: 10 },
];

const ANIMAL_TARGETS = ["Deer", "Fish", "Possum", "Raccoon", "Bear", "Owl", "Beaver"];

const ALL_TARGETS = [
  ...RING_TARGETS.map((r) => ({ id: r.id, kind: "ring", rings: r.rings })),
  ...ANIMAL_TARGETS.map((a) => ({ id: a, kind: "animal" })),
];

// ---------- Helpers ----------
function ringColor(distFromCenter) {
  if (distFromCenter === 0) return COLORS.accent;
  return distFromCenter % 2 === 1 ? COLORS.cream : COLORS.panelSoft;
}

// ---------- Persistent storage helpers ----------
async function storageGet(key, shared = false, fallback = null) {
  try {
    const res = await window.storage.get(key, shared);
    if (!res) return fallback;
    try {
      return JSON.parse(res.value);
    } catch {
      return res.value;
    }
  } catch {
    return fallback;
  }
}

async function storageSet(key, value, shared = false) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch {
    return false;
  }
}

async function storageDelete(key, shared = false) {
  try {
    await window.storage.delete(key, shared);
    return true;
  } catch {
    return false;
  }
}

async function storageListKeys(prefix, shared = false) {
  try {
    const res = await window.storage.list(prefix, shared);
    return res && res.keys ? res.keys : [];
  } catch {
    return [];
  }
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function computeEndTotal(arrowMode, scores) {
  if (!scores || scores.length === 0) return 0;
  if (!arrowMode || arrowMode.mode !== "best") {
    return scores.reduce((a, b) => a + b, 0);
  }
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted.slice(0, arrowMode.keepCount).reduce((a, b) => a + b, 0);
}

function buildScorecardText(archer, players, ends, arrowMode) {
  const date = new Date().toLocaleDateString();
  function scoresFor(end, playerId) {
    return (end.playerArrows[playerId] || []).map((a) => a.score);
  }
  let lines = [];
  lines.push("ARCHERY SCORECARD");
  lines.push(`Bow: ${archer.bowType}`);
  lines.push(`Arrows/Target: ${arrowMode.mode === "best" ? `Best ${arrowMode.keepCount} of ${arrowMode.shootCount}` : arrowMode.shootCount}`);
  lines.push(`Date: ${date}`);
  lines.push("");
  ends.forEach((end, i) => {
    lines.push(`Target ${end.endNumber ?? i + 1} (${end.target.id}, ${end.distance !== "" && end.distance != null ? `${end.distance}yds` : "-"})`);
    players.forEach((p, pi) => {
      const scores = scoresFor(end, p.id);
      const total = computeEndTotal(arrowMode, scores);
      lines.push(`  ${p.name || `Player ${pi + 1}`}: ${scores.join(", ")} = ${total}`);
    });
  });
  lines.push("");
  players.forEach((p, pi) => {
    const total = ends.reduce((s, end) => s + computeEndTotal(arrowMode, scoresFor(end, p.id)), 0);
    lines.push(`${p.name || `Player ${pi + 1}`} TOTAL: ${total}`);
  });
  return lines.join("\n");
}

function useTapScore(svgRef, onScore) {
  return (e, score) => {
    e.stopPropagation();
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 300;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    onScore(score, x, y);
  };
}

function ArrowMarkers({ arrows }) {
  return (
    <g>
      {arrows.map((a, i) => (
        <g key={i}>
          <circle cx={a.x} cy={a.y} r={7} fill="#fff" stroke={COLORS.ink} strokeWidth={2} />
          <circle cx={a.x} cy={a.y} r={2.5} fill={COLORS.ink} />
        </g>
      ))}
    </g>
  );
}

// ---------- Ring target ----------
function RingTarget({ rings, size = 300, interactive = true, onScore, arrows = [] }) {
  const svgRef = useRef(null);
  const tap = useTapScore(svgRef, onScore || (() => {}));
  const outerR = 140;
  const circles = [];
  for (let k = 1; k <= rings; k++) {
    const dist = rings - k; // 0 = center
    const r = (outerR * (rings - k + 1)) / rings;
    circles.push({ r, score: k, color: ringColor(dist) });
  }
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      width={size}
      height={size}
      style={{ touchAction: "manipulation" }}
    >
      <circle cx={150} cy={150} r={148} fill={COLORS.panel} />
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={150}
          cy={150}
          r={c.r}
          fill={c.color}
          stroke={COLORS.ink}
          strokeWidth={2}
          onClick={interactive ? (e) => tap(e, c.score) : undefined}
          style={interactive ? { cursor: "pointer" } : undefined}
        />
      ))}
      {interactive && <ArrowMarkers arrows={arrows} />}
    </svg>
  );
}

// ---------- Animal targets ----------
// Shared quadruped builder: legs/ears/tail vary by animal
function Quadruped({ animal, size, interactive, onScore, arrows, svgRef, tap }) {
  const cfg = {
    Deer: { body: "#8A5A3C", legH: 55, earType: "tall", tail: "short", mask: false },
    Possum: { body: "#9B9A8C", legH: 30, earType: "round", tail: "long", mask: false },
    Raccoon: { body: "#6E6455", legH: 30, earType: "round", tail: "ringed", mask: true },
    Bear: { body: "#3B2A20", legH: 30, earType: "small", tail: "stub", mask: false },
    Beaver: { body: "#6B4423", legH: 20, earType: "small", tail: "paddle", mask: false },
  }[animal];

  const bodyCx = 160, bodyCy = 160, bodyRx = 85, bodyRy = 50;
  const headCx = 75, headCy = 120, headR = 26;
  const legY = bodyCy + bodyRy - 5;

  const bodyClick = interactive ? (e) => tap(e, 5) : undefined;

  return (
    <>
      {/* miss zone */}
      <rect
        x={0}
        y={0}
        width={300}
        height={300}
        fill={COLORS.panel}
        onClick={interactive ? (e) => tap(e, 0) : undefined}
        style={interactive ? { cursor: "pointer" } : undefined}
      />
      {/* legs */}
      {[bodyCx - 55, bodyCx - 20, bodyCx + 25, bodyCx + 55].map((x, i) => (
        <rect
          key={i}
          x={x}
          y={legY}
          width={10}
          height={cfg.legH}
          rx={4}
          fill={cfg.body}
          onClick={bodyClick}
          style={interactive ? { cursor: "pointer" } : undefined}
        />
      ))}
      {/* tail */}
      {cfg.tail === "long" && (
        <rect x={bodyCx + bodyRx - 5} y={bodyCy - 5} width={55} height={7} rx={3} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      )}
      {cfg.tail === "ringed" && (
        <g onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined}>
          <rect x={bodyCx + bodyRx - 5} y={bodyCy - 20} width={40} height={14} rx={6} fill={cfg.body} />
          <rect x={bodyCx + bodyRx + 10} y={bodyCy - 20} width={8} height={14} fill={COLORS.ink} opacity={0.5} />
          <rect x={bodyCx + bodyRx + 25} y={bodyCy - 20} width={8} height={14} fill={COLORS.ink} opacity={0.5} />
        </g>
      )}
      {(cfg.tail === "short" || cfg.tail === "stub") && (
        <ellipse cx={bodyCx + bodyRx} cy={bodyCy - 10} rx={cfg.tail === "stub" ? 12 : 8} ry={8} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      )}
      {cfg.tail === "paddle" && (
        <g onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined}>
          <ellipse cx={bodyCx + bodyRx + 20} cy={bodyCy + 5} rx={38} ry={16} fill={cfg.body} stroke={COLORS.ink} strokeWidth={2} />
          <line x1={bodyCx + bodyRx} y1={bodyCy - 2} x2={bodyCx + bodyRx + 50} y2={bodyCy - 2} stroke={COLORS.ink} strokeWidth={1} opacity={0.3} />
          <line x1={bodyCx + bodyRx + 5} y1={bodyCy + 8} x2={bodyCx + bodyRx + 55} y2={bodyCy + 8} stroke={COLORS.ink} strokeWidth={1} opacity={0.3} />
        </g>
      )}
      {/* body */}
      <ellipse cx={bodyCx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={cfg.body} stroke={COLORS.ink} strokeWidth={2} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* neck/head connector */}
      <ellipse cx={105} cy={135} rx={30} ry={22} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* head */}
      <circle cx={headCx} cy={headCy} r={headR} fill={cfg.body} stroke={COLORS.ink} strokeWidth={2} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* mask (raccoon) */}
      {cfg.mask && <rect x={headCx - 22} y={headCy - 6} width={44} height={10} rx={5} fill={COLORS.ink} opacity={0.55} />}
      {/* ears */}
      {cfg.earType === "tall" && (
        <>
          <polygon points={`${headCx - 18},${headCy - 20} ${headCx - 26},${headCy - 55} ${headCx - 6},${headCy - 28}`} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
          <polygon points={`${headCx + 4},${headCy - 26} ${headCx + 6},${headCy - 60} ${headCx + 22},${headCy - 22}`} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
        </>
      )}
      {cfg.earType === "round" && (
        <>
          <circle cx={headCx - 16} cy={headCy - 22} r={9} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
          <circle cx={headCx + 14} cy={headCy - 24} r={9} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
        </>
      )}
      {cfg.earType === "small" && (
        <>
          <circle cx={headCx - 14} cy={headCy - 22} r={7} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
          <circle cx={headCx + 12} cy={headCy - 23} r={7} fill={cfg.body} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
        </>
      )}
      {/* vitals + kill zone (over front shoulder) */}
      <ellipse
        cx={bodyCx - 20}
        cy={bodyCy - 2}
        rx={30}
        ry={20}
        fill={cfg.body}
        fillOpacity={0.35}
        stroke={COLORS.cream}
        strokeDasharray="5 4"
        strokeWidth={2}
        onClick={interactive ? (e) => tap(e, 8) : undefined}
        style={interactive ? { cursor: "pointer" } : undefined}
      />
      <circle
        cx={bodyCx - 20}
        cy={bodyCy - 2}
        r={8}
        fill={COLORS.accent}
        onClick={interactive ? (e) => tap(e, 10) : undefined}
        style={interactive ? { cursor: "pointer" } : undefined}
      />
    </>
  );
}

function FishTarget({ interactive, tap }) {
  const bodyClick = interactive ? (e) => tap(e, 5) : undefined;
  return (
    <>
      <rect x={0} y={0} width={300} height={300} fill={COLORS.panel} onClick={interactive ? (e) => tap(e, 0) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* tail fin */}
      <polygon points="250,150 300,110 300,190" fill="#4A6B7A" onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* dorsal fin */}
      <polygon points="140,95 180,60 210,95" fill="#4A6B7A" onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* body */}
      <ellipse cx={150} cy={150} rx={100} ry={55} fill="#557E8C" stroke={COLORS.ink} strokeWidth={2} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* eye (decorative) */}
      <circle cx={65} cy={135} r={5} fill={COLORS.ink} opacity={0.6} />
      {/* vitals */}
      <ellipse cx={135} cy={155} rx={28} ry={20} fill="#3E5F6B" fillOpacity={0.5} stroke={COLORS.cream} strokeDasharray="5 4" strokeWidth={2}
        onClick={interactive ? (e) => tap(e, 8) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
      <circle cx={135} cy={155} r={8} fill={COLORS.accent}
        onClick={interactive ? (e) => tap(e, 10) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
    </>
  );
}

function OwlTarget({ interactive, tap }) {
  const bodyClick = interactive ? (e) => tap(e, 5) : undefined;
  const owlColor = "#7A6248";
  const owlColorDark = "#5E4B37";
  return (
    <>
      <rect x={0} y={0} width={300} height={300} fill={COLORS.panel} onClick={interactive ? (e) => tap(e, 0) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* wings */}
      <ellipse cx={92} cy={170} rx={24} ry={65} fill={owlColorDark} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      <ellipse cx={208} cy={170} rx={24} ry={65} fill={owlColorDark} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* body */}
      <ellipse cx={150} cy={175} rx={62} ry={80} fill={owlColor} stroke={COLORS.ink} strokeWidth={2} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* head */}
      <circle cx={150} cy={95} r={48} fill={owlColor} stroke={COLORS.ink} strokeWidth={2} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* ear tufts */}
      <polygon points="118,60 108,25 132,52" fill={owlColor} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      <polygon points="182,60 192,25 168,52" fill={owlColor} onClick={bodyClick} style={interactive ? { cursor: "pointer" } : undefined} />
      {/* eyes (decorative) */}
      <circle cx={130} cy={95} r={14} fill="#F3ECD9" pointerEvents="none" />
      <circle cx={170} cy={95} r={14} fill="#F3ECD9" pointerEvents="none" />
      <circle cx={130} cy={95} r={6} fill={COLORS.ink} pointerEvents="none" />
      <circle cx={170} cy={95} r={6} fill={COLORS.ink} pointerEvents="none" />
      {/* beak (decorative) */}
      <polygon points="145,108 155,108 150,120" fill="#E8A33D" pointerEvents="none" />
      {/* vitals */}
      <ellipse cx={150} cy={175} rx={26} ry={30} fill={owlColorDark} fillOpacity={0.5} stroke={COLORS.cream} strokeDasharray="5 4" strokeWidth={2}
        onClick={interactive ? (e) => tap(e, 8) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
      <circle cx={150} cy={175} r={8} fill={COLORS.accent}
        onClick={interactive ? (e) => tap(e, 10) : undefined} style={interactive ? { cursor: "pointer" } : undefined} />
    </>
  );
}

function AnimalTarget({ animal, size = 300, interactive = true, onScore, arrows = [] }) {
  const svgRef = useRef(null);
  const tap = useTapScore(svgRef, onScore || (() => {}));
  return (
    <svg ref={svgRef} viewBox="0 0 300 300" width={size} height={size} style={{ touchAction: "manipulation" }}>
      {animal === "Fish" && <FishTarget interactive={interactive} tap={tap} />}
      {animal === "Owl" && <OwlTarget interactive={interactive} tap={tap} />}
      {animal !== "Fish" && animal !== "Owl" && (
        <Quadruped animal={animal} size={size} interactive={interactive} onScore={onScore} arrows={arrows} svgRef={svgRef} tap={tap} />
      )}
      {interactive && <ArrowMarkers arrows={arrows} />}
    </svg>
  );
}

function TargetPreview({ target, size = 96 }) {
  if (target.kind === "ring") {
    return <RingTarget rings={target.rings} size={size} interactive={false} />;
  }
  return <AnimalTarget animal={target.id} size={size} interactive={false} />;
}

// ---------- UI bits ----------
function Btn({ children, onClick, variant = "solid", disabled, style }) {
  const base = {
    padding: "12px 20px",
    borderRadius: 10,
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    fontSize: 14,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "transform 0.08s ease",
  };
  const variants = {
    solid: { background: COLORS.accent, color: COLORS.ink },
    outline: { background: "transparent", color: COLORS.cream, border: `2px solid ${COLORS.khaki}` },
    ghost: { background: "transparent", color: COLORS.khaki },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        border: `2px solid ${active ? COLORS.accent : COLORS.khaki}`,
        background: active ? COLORS.accent : "transparent",
        color: active ? COLORS.ink : COLORS.cream,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function NumberStepper({ label, value, onChange, min = 1, suffix }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ color: COLORS.khaki, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(min, (Number(value) || min) - 1))}
          style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, fontWeight: 900, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return onChange("");
            onChange(Math.max(min, Number(v)));
          }}
          style={{
            width: 52,
            textAlign: "center",
            padding: "6px 4px",
            borderRadius: 8,
            border: `2px solid ${COLORS.panelSoft}`,
            background: COLORS.bg,
            color: COLORS.cream,
            fontWeight: 800,
            fontSize: 14,
          }}
        />
        {suffix && <span style={{ color: COLORS.khaki, fontSize: 12 }}>{suffix}</span>}
        <button
          onClick={() => onChange((Number(value) || min) + 1)}
          style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, fontWeight: 900, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function EndSettingsBar({ endNumber, setEndNumber, distance, setDistance }) {
  return (
    <div style={{ display: "flex", gap: 24, padding: "14px 18px", background: COLORS.panelSoft, justifyContent: "center" }}>
      <NumberStepper label="TARGET #" value={endNumber} onChange={setEndNumber} min={1} />
      <NumberStepper label="DISTANCE" value={distance} onChange={setDistance} min={0} suffix="yds" />
    </div>
  );
}

function TopBar({ archer, roundTotal, endLabel, onBack, onEndRound }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.panelSoft}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.khaki, cursor: "pointer", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
        )}
        <div>
          <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>{archer.name || "Archer"}</div>
          {endLabel && <div style={{ color: COLORS.khaki, fontSize: 12 }}>{endLabel}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: COLORS.accentSoft, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{roundTotal}</div>
          <div style={{ color: COLORS.khaki, fontSize: 10, letterSpacing: "0.08em" }}>TOTAL</div>
        </div>
        {onEndRound && (
          <button onClick={onEndRound} style={{ background: "none", border: `2px solid ${COLORS.khaki}`, color: COLORS.khaki, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            End Round
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Screens ----------
function ArrowModeSection({ arrowMode, setArrowMode }) {
  const isBest = arrowMode.mode === "best";
  const bestPresets = [
    { shoot: 3, keep: 1 },
    { shoot: 5, keep: 1 },
    { shoot: 5, keep: 3 },
    { shoot: 6, keep: 3 },
  ];
  return (
    <div>
      <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>ARROWS PER TARGET</label>
      <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 12 }}>
        <Pill
          label="Fixed Count"
          active={!isBest}
          onClick={() => setArrowMode({ mode: "fixed", shootCount: arrowMode.shootCount || 3, keepCount: arrowMode.shootCount || 3 })}
        />
        <Pill label="Best Of" active={isBest} onClick={() => setArrowMode({ mode: "best", shootCount: 3, keepCount: 1 })} />
      </div>

      {!isBest && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[1, 3, 5, 6].map((n) => (
              <Pill
                key={n}
                label={String(n)}
                active={arrowMode.shootCount === n}
                onClick={() => setArrowMode({ mode: "fixed", shootCount: n, keepCount: n })}
              />
            ))}
          </div>
          <NumberStepper
            label="CUSTOM AMOUNT"
            value={arrowMode.shootCount}
            onChange={(v) => setArrowMode({ mode: "fixed", shootCount: Number(v) || 1, keepCount: Number(v) || 1 })}
            min={1}
          />
        </div>
      )}

      {isBest && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {bestPresets.map((p) => (
              <Pill
                key={`${p.shoot}-${p.keep}`}
                label={`Best ${p.keep} of ${p.shoot}`}
                active={arrowMode.shootCount === p.shoot && arrowMode.keepCount === p.keep}
                onClick={() => setArrowMode({ mode: "best", shootCount: p.shoot, keepCount: p.keep })}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <NumberStepper
              label="SHOOT"
              value={arrowMode.shootCount}
              onChange={(v) => {
                const shoot = Math.max(1, Number(v) || 1);
                setArrowMode({ mode: "best", shootCount: shoot, keepCount: Math.min(arrowMode.keepCount, shoot) });
              }}
              min={1}
            />
            <NumberStepper
              label="KEEP BEST"
              value={arrowMode.keepCount}
              onChange={(v) => {
                const keep = Math.max(1, Number(v) || 1);
                setArrowMode({ mode: "best", shootCount: arrowMode.shootCount, keepCount: Math.min(keep, arrowMode.shootCount) });
              }}
              min={1}
            />
          </div>
          <div style={{ color: COLORS.khaki, fontSize: 11, marginTop: 8 }}>
            Shoot {arrowMode.shootCount} arrows per target, only the best {arrowMode.keepCount} count toward the score.
          </div>
        </div>
      )}
    </div>
  );
}

function SetupScreen({ archer, setArcher, players, setPlayers, arrowMode, setArrowMode, onStart }) {
  function setPlayerCount(n) {
    const count = Math.max(1, Number(n) || 1);
    setPlayers((prev) => {
      const next = [...prev];
      while (next.length < count) next.push({ id: newId(), name: "" });
      while (next.length > count) next.pop();
      return next;
    });
  }

  function setPlayerName(id, name) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ color: COLORS.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.25em", marginBottom: 6 }}>SIMPLE SCOREKEEPING</div>
      <h1 style={{ color: COLORS.cream, fontSize: 32, fontWeight: 900, letterSpacing: "0.02em", margin: "0 0 30px", textAlign: "center" }}>
        ROUND SETUP
      </h1>

      <div style={{ width: "100%", maxWidth: 380, background: COLORS.panel, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <NumberStepper label="NUMBER OF PLAYERS" value={players.length} onChange={setPlayerCount} min={1} />
        </div>

        <div>
          <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>PLAYER NAMES</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {players.map((p, i) => (
              <input
                key={p.id}
                value={p.name}
                onChange={(e) => setPlayerName(p.id, e.target.value)}
                placeholder={`Player ${i + 1} name`}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, fontSize: 15, boxSizing: "border-box" }}
              />
            ))}
          </div>
        </div>

        <div>
          <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>BOW TYPE</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["Compound", "Recurve", "Traditional"].map((b) => (
              <Pill key={b} label={b} active={archer.bowType === b} onClick={() => setArcher({ ...archer, bowType: b })} />
            ))}
          </div>
        </div>

        <ArrowModeSection arrowMode={arrowMode} setArrowMode={setArrowMode} />

        <Btn onClick={onStart} style={{ marginTop: 6, width: "100%" }}>
          Confirm & Start
        </Btn>
      </div>
    </div>
  );
}

function MiniScoreboard({ players, totals, activeId }) {
  if (!players || players.length <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 18px", overflowX: "auto", background: COLORS.bg }}>
      {players.map((p, i) => (
        <div
          key={p.id}
          style={{
            background: p.id === activeId ? COLORS.accent : COLORS.panelSoft,
            color: p.id === activeId ? COLORS.ink : COLORS.cream,
            borderRadius: 10,
            padding: "6px 12px",
            fontWeight: 700,
            fontSize: 12,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {p.name || `Player ${i + 1}`} · {totals[p.id] || 0}
        </div>
      ))}
    </div>
  );
}

function TargetSelectScreen({ archer, players, playerTotals, roundTotal, endNumber, setEndNumber, distance, setDistance, onPick, onEndRound, canGoBack, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <TopBar archer={archer} roundTotal={roundTotal} endLabel={`Choose target`} onBack={canGoBack ? onBack : null} onEndRound={onEndRound} />
      <MiniScoreboard players={players} totals={playerTotals} activeId={null} />
      <EndSettingsBar endNumber={endNumber} setEndNumber={setEndNumber} distance={distance} setDistance={setDistance} />
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 480, margin: "0 auto" }}>
        {ALL_TARGETS.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            style={{
              background: COLORS.panel,
              border: `2px solid ${COLORS.panelSoft}`,
              borderRadius: 14,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <TargetPreview target={t} size={90} />
            <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{t.id}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoringScreen({
  archer,
  players,
  currentPlayerIndex,
  target,
  currentPlayerArrows,
  arrowMode,
  addArrow,
  undoArrow,
  onNextPlayer,
  playerTotals,
  roundTotal,
  onFinishEnd,
  onEndRound,
  endNumber,
  setEndNumber,
  distance,
  setDistance,
}) {
  const currentPlayer = players[currentPlayerIndex];
  const arrows = currentPlayerArrows[currentPlayer.id] || [];
  const shootCount = arrowMode.shootCount;
  const endTotal = computeEndTotal(arrowMode, arrows.map((a) => a.score));
  const isLastPlayer = currentPlayerIndex === players.length - 1;
  const canAdvance = arrows.length > 0;
  const playerLabel = currentPlayer.name || `Player ${currentPlayerIndex + 1}`;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      <TopBar
        archer={archer}
        roundTotal={roundTotal}
        endLabel={`${target.id} — ${playerLabel} — Arrow ${Math.min(arrows.length + 1, shootCount)} of ${shootCount}`}
      />
      <MiniScoreboard players={players} totals={playerTotals} activeId={currentPlayer.id} />
      <EndSettingsBar endNumber={endNumber} setEndNumber={setEndNumber} distance={distance} setDistance={setDistance} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
        {players.length > 1 && (
          <div style={{ color: COLORS.accentSoft, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Now shooting: {playerLabel}</div>
        )}

        <div style={{ background: COLORS.panel, borderRadius: 20, padding: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}>
          {target.kind === "ring" ? (
            <RingTarget rings={target.rings} size={300} onScore={addArrow} arrows={arrows} />
          ) : (
            <AnimalTarget animal={target.id} size={300} onScore={addArrow} arrows={arrows} />
          )}
        </div>

        <div style={{ marginTop: 18, color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>
          Tap the target where each arrow landed.
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {arrows.map((a, i) => (
            <div key={i} style={{ background: COLORS.panelSoft, color: COLORS.cream, borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 13 }}>
              #{i + 1}: {a.score}
            </div>
          ))}
        </div>

        {arrowMode.mode === "best" && arrows.length > 0 && (
          <div style={{ color: COLORS.khaki, fontSize: 12, marginTop: 6, textAlign: "center" }}>
            Best {arrowMode.keepCount} of {arrows.length} shot count toward the score
          </div>
        )}

        <div style={{ marginTop: 14, color: COLORS.accentSoft, fontWeight: 900, fontSize: 22 }}>
          End total: {endTotal}
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <Btn variant="outline" disabled={arrows.length === 0} onClick={undoArrow}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RotateCcw size={16} /> Undo Last Arrow
            </span>
          </Btn>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 12, width: "100%", maxWidth: 340 }}>
          {!isLastPlayer ? (
            <Btn disabled={!canAdvance} onClick={onNextPlayer} style={{ flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={16} /> Next Player
              </span>
            </Btn>
          ) : (
            <Btn disabled={!canAdvance} onClick={onFinishEnd} style={{ flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={16} /> Next Target
              </span>
            </Btn>
          )}
          <Btn
            variant="outline"
            onClick={onEndRound}
            style={{ flex: 1, borderColor: COLORS.miss, color: COLORS.accentSoft }}
          >
            End Round
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ShareMenu({ shareText, onClose }) {
  const [status, setStatus] = useState("");
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  async function doNativeShare() {
    try {
      await navigator.share({ title: "Archery Round", text: shareText });
      onClose();
    } catch (e) {
      /* user cancelled or unsupported, do nothing */
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("Copied!");
      setTimeout(() => setStatus(""), 1800);
    } catch (e) {
      setStatus("Couldn't copy");
    }
  }

  function shareOnX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  }

  return (
    <div style={{ background: COLORS.panelSoft, borderRadius: 14, padding: 16, marginTop: 14, width: "100%", maxWidth: 420, boxSizing: "border-box" }}>
      <div style={{ color: COLORS.cream, fontSize: 13, marginBottom: 12, fontStyle: "italic" }}>"{shareText}"</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {canNativeShare && (
          <Btn onClick={doNativeShare} style={{ flex: 1 }}>
            Share
          </Btn>
        )}
        <Btn variant="outline" onClick={shareOnX} style={{ flex: 1 }}>
          Share on X
        </Btn>
        <Btn variant="outline" onClick={copyText} style={{ flex: 1 }}>
          Copy Text
        </Btn>
      </div>
      {status && <div style={{ color: COLORS.accentSoft, fontSize: 12, marginTop: 8, textAlign: "center" }}>{status}</div>}
    </div>
  );
}

function SummaryScreen({ archer, players, ends, arrowMode, onNewRound, onExport }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [submitTarget, setSubmitTarget] = useState("global");
  const [submitStatus, setSubmitStatus] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0].id);

  function scoresFor(end, playerId) {
    return (end.playerArrows[playerId] || []).map((a) => a.score);
  }
  function playerTotal(playerId) {
    return ends.reduce((s, end) => s + computeEndTotal(arrowMode, scoresFor(end, playerId)), 0);
  }
  function playerArrowCount(playerId) {
    return ends.reduce((s, end) => s + (end.playerArrows[playerId] || []).length, 0);
  }

  const ranked = players
    .map((p, i) => ({ ...p, label: p.name || `Player ${i + 1}`, total: playerTotal(p.id), arrowCount: playerArrowCount(p.id) }))
    .sort((a, b) => b.total - a.total);

  const selected = ranked.find((p) => p.id === selectedPlayerId) || ranked[0];
  const selectedAvg = selected.arrowCount ? (selected.total / selected.arrowCount).toFixed(1) : "0.0";

  const shareText =
    players.length <= 1
      ? `I scored ${ranked[0].total} points in my archery round with my ${archer.bowType.toLowerCase()}! 🎯🏹`
      : `Archery round scores — ${ranked.map((p) => `${p.label}: ${p.total}`).join(", ")} 🎯🏹`;

  async function openSubmit() {
    setSubmitOpen((s) => !s);
    if (!submitOpen) {
      const keys = await storageListKeys("leagues:", true);
      const items = [];
      for (const k of keys) {
        const v = await storageGet(k, true, null);
        if (v) items.push(v);
      }
      setLeagues(items);
    }
  }

  async function submitScores() {
    const key = submitTarget === "global" ? "leaderboard:global" : `leaderboard:league:${submitTarget}`;
    const existing = await storageGet(key, true, []);
    const newEntries = ranked.map((p) => ({ name: p.label, score: p.total, bowType: archer.bowType, date: new Date().toISOString() }));
    const next = [...(Array.isArray(existing) ? existing : []), ...newEntries].sort((a, b) => b.score - a.score).slice(0, 50);
    await storageSet(key, next, true);
    setSubmitStatus("Submitted!");
    setTimeout(() => setSubmitStatus(""), 1800);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Trophy size={40} color={COLORS.accent} />
      <h1 style={{ color: COLORS.cream, fontSize: 26, fontWeight: 900, margin: "10px 0 2px" }}>ROUND COMPLETE</h1>
      <div style={{ color: COLORS.khaki, marginBottom: 20 }}>{archer.bowType}</div>

      <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20, width: "100%", maxWidth: 420 }}>
        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
          {players.length > 1 ? "Standings" : "Score"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {ranked.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: p.id === selected.id ? COLORS.accent : COLORS.panelSoft,
                borderRadius: 10,
                padding: "10px 14px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ color: p.id === selected.id ? COLORS.ink : COLORS.cream, fontWeight: 700, fontSize: 13 }}>
                {players.length > 1 ? `#${i + 1} ` : ""}{p.label}
              </div>
              <div style={{ color: p.id === selected.id ? COLORS.ink : COLORS.accentSoft, fontWeight: 900, fontSize: 18 }}>{p.total}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: COLORS.khaki, fontSize: 12 }}>Avg / arrow for {selected.label}</div>
          <div style={{ color: COLORS.cream, fontWeight: 800 }}>{selectedAvg}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ends.map((end, i) => {
            const scores = scoresFor(end, selected.id);
            const total = computeEndTotal(arrowMode, scores);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelSoft, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>
                  Target {end.endNumber ?? i + 1} · {end.target.id}
                  {end.distance !== "" && end.distance != null && (
                    <span style={{ color: COLORS.khaki, fontWeight: 500 }}> · {end.distance} yds</span>
                  )}
                </div>
                <div style={{ color: COLORS.cream, fontSize: 12, opacity: 0.8 }}>{scores.join(" · ")}</div>
                <div style={{ color: COLORS.accentSoft, fontWeight: 900 }}>{total}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <Btn variant="outline" onClick={() => setShareOpen((s) => !s)}>
          Share Score
        </Btn>
        <Btn onClick={onExport}>Export Scorecard</Btn>
        <Btn variant="outline" onClick={openSubmit}>
          Submit to Leaderboard
        </Btn>
      </div>

      {shareOpen && <ShareMenu shareText={shareText} onClose={() => setShareOpen(false)} />}

      {submitOpen && (
        <div style={{ background: COLORS.panelSoft, borderRadius: 14, padding: 16, marginTop: 14, width: "100%", maxWidth: 420, boxSizing: "border-box" }}>
          <div style={{ color: COLORS.khaki, fontSize: 12, marginBottom: 10 }}>
            Visible to everyone using this app. {players.length > 1 ? "All players' scores" : "Your score"} will be posted to:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Pill label="Global" active={submitTarget === "global"} onClick={() => setSubmitTarget("global")} />
            {leagues.map((l) => (
              <Pill key={l.id} label={l.name} active={submitTarget === l.id} onClick={() => setSubmitTarget(l.id)} />
            ))}
          </div>
          <Btn onClick={submitScores} style={{ width: "100%" }}>
            Confirm Submit
          </Btn>
          {submitStatus && <div style={{ color: COLORS.accentSoft, fontSize: 12, marginTop: 8, textAlign: "center" }}>{submitStatus}</div>}
        </div>
      )}

      <Btn variant="ghost" onClick={onNewRound} style={{ marginTop: 20 }}>
        Start New Round
      </Btn>
    </div>
  );
}

function ScorecardScreen({ archer, players, ends, arrowMode, onBack }) {
  const date = new Date().toLocaleDateString();
  const scorecardText = buildScorecardText(archer, players, ends, arrowMode);
  const paper = "#FBF7EE";
  const ink = "#1B2A1E";
  const rule = "#C9B896";

  function scoresFor(end, playerId) {
    return (end.playerArrows[playerId] || []).map((a) => a.score);
  }
  const playerTotals = players.map((p) => ends.reduce((s, end) => s + computeEndTotal(arrowMode, scoresFor(end, p.id)), 0));

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Archery Scorecard - ${date}`);
    const body = encodeURIComponent(scorecardText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`@media print { .no-print { display: none !important; } .print-sheet { box-shadow: none !important; margin: 0 !important; } body { background: white !important; } }`}</style>

      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 18, width: "100%", maxWidth: 640 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.khaki, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
          <ChevronLeft size={20} /> Back
        </button>
      </div>

      <div className="print-sheet" style={{ background: paper, color: ink, width: "100%", maxWidth: 640, borderRadius: 8, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", boxSizing: "border-box", overflowX: "auto" }}>
        <div style={{ textAlign: "center", borderBottom: `2px solid ${ink}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", fontWeight: 700, opacity: 0.7 }}>OFFICIAL</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.04em" }}>ARCHERY SCORECARD</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 18 }}>
          <div><strong>Date:</strong> {date}</div>
          <div><strong>Bow Type:</strong> {archer.bowType}</div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Arrows/Target:</strong> {arrowMode.mode === "best" ? `Best ${arrowMode.keepCount} of ${arrowMode.shootCount}` : arrowMode.shootCount}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16, minWidth: players.length > 2 ? 480 : "auto" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${ink}`, textAlign: "left" }}>
              <th style={{ padding: "6px 4px" }}>Tgt</th>
              <th style={{ padding: "6px 4px" }}>Type</th>
              <th style={{ padding: "6px 4px" }}>Dist</th>
              {players.map((p, pi) => (
                <th key={p.id} style={{ padding: "6px 4px" }}>{p.name || `Player ${pi + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ends.map((end, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${rule}` }}>
                <td style={{ padding: "6px 4px" }}>{end.endNumber ?? i + 1}</td>
                <td style={{ padding: "6px 4px" }}>{end.target.id}</td>
                <td style={{ padding: "6px 4px" }}>{end.distance !== "" && end.distance != null ? `${end.distance}yd` : "-"}</td>
                {players.map((p) => {
                  const scores = scoresFor(end, p.id);
                  const total = computeEndTotal(arrowMode, scores);
                  return (
                    <td key={p.id} style={{ padding: "6px 4px" }}>
                      {scores.join(",")} <strong>({total})</strong>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "flex-end", borderTop: `2px solid ${ink}`, paddingTop: 12, marginBottom: 22 }}>
          {players.map((p, pi) => (
            <div key={p.id} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{(p.name || `Player ${pi + 1}`).toUpperCase()} TOTAL</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{playerTotals[pi]}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, opacity: 0.8 }}>
          {players.map((p, pi) => (
            <div key={p.id}>{p.name || `Player ${pi + 1}`} Signature: ________________________</div>
          ))}
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <Btn onClick={handlePrint}>Save as PDF</Btn>
        <Btn variant="outline" onClick={handleEmail}>
          Email to League
        </Btn>
      </div>
    </div>
  );
}

// ---------- Home menu ----------
function MenuTile({ icon, label, sublabel, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: COLORS.panel,
        border: `2px solid ${COLORS.panelSoft}`,
        borderRadius: 16,
        padding: "18px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ background: COLORS.panelSoft, borderRadius: 12, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>{label}</div>
        {sublabel && <div style={{ color: COLORS.khaki, fontSize: 12, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </button>
  );
}

function HomeScreen({ archer, setArcher, onStartRound, onLocations, onStats, onLeaderboard, onOpenRange }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: "36px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: COLORS.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.25em", marginBottom: 6 }}>SIMPLE SCOREKEEPING</div>
      <h1 style={{ color: COLORS.cream, fontSize: 30, fontWeight: 900, margin: "0 0 22px", textAlign: "center" }}>ARCHER HOME</h1>

      <div style={{ width: "100%", maxWidth: 380, background: COLORS.panel, borderRadius: 14, padding: 16, marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
        <User size={18} color={COLORS.khaki} />
        <input
          value={archer.name}
          onChange={(e) => setArcher({ ...archer, name: e.target.value })}
          placeholder="Your name"
          style={{ flex: 1, background: "transparent", border: "none", color: COLORS.cream, fontSize: 15, fontWeight: 700, outline: "none" }}
        />
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        <Btn onClick={onStartRound} style={{ width: "100%", padding: "16px 20px" }}>
          Start New Round
        </Btn>

        <MenuTile icon={<MapPin size={20} color={COLORS.accentSoft} />} label="Locations" sublabel="Pin your favorite ranges" onClick={onLocations} />
        <MenuTile icon={<TrendingUp size={20} color={COLORS.accentSoft} />} label="Stats" sublabel="Your personal bests & trends" onClick={onStats} />
        <MenuTile icon={<Users size={20} color={COLORS.accentSoft} />} label="Leaderboard / Leagues" sublabel="See how you stack up" onClick={onLeaderboard} />
        <MenuTile icon={<MessageSquare size={20} color={COLORS.accentSoft} />} label="Open Range" sublabel="Message board & tips" onClick={onOpenRange} />
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.panelSoft}` }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.khaki, cursor: "pointer", padding: 4, display: "flex" }}>
        <ChevronLeft size={22} />
      </button>
      <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 17 }}>{title}</div>
    </div>
  );
}

// ---------- Locations ----------
function LocationsScreen({ onBack }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingPin, setPendingPin] = useState(null); // {x,y} percent
  const [form, setForm] = useState({ name: "", address: "", notes: "" });
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await storageGet("locations", false, []);
      setLocations(Array.isArray(saved) ? saved : []);
      setLoading(false);
    })();
  }, []);

  function handleMapClick(e) {
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setForm({ name: "", address: "", notes: "" });
  }

  async function savePin() {
    if (!form.name.trim() || !pendingPin) return;
    const entry = { id: newId(), x: pendingPin.x, y: pendingPin.y, ...form };
    const next = [...locations, entry];
    setLocations(next);
    setPendingPin(null);
    await storageSet("locations", next, false);
  }

  async function removeLocation(id) {
    const next = locations.filter((l) => l.id !== id);
    setLocations(next);
    await storageSet("locations", next, false);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <ScreenHeader title="Locations" onBack={onBack} />
      <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: COLORS.khaki, fontSize: 12, marginBottom: 10 }}>
          Tap the board below to drop a pin for a range. This is a stylized board, not a real map — add a real address to each pin so you can open it in Maps.
        </div>

        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1.3",
            borderRadius: 16,
            overflow: "hidden",
            cursor: "crosshair",
            border: `2px solid ${COLORS.panelSoft}`,
            background: `linear-gradient(180deg, #2C4526 0%, #22391E 55%, #1B2E17 100%)`,
          }}
        >
          <svg viewBox="0 0 300 230" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
            <path d="M0,150 Q80,120 150,160 T300,140 L300,230 L0,230 Z" fill="#3A5A32" opacity="0.6" />
            <path d="M-10,90 Q100,70 180,100 T310,85" stroke="#5B7A8C" strokeWidth="10" fill="none" opacity="0.5" />
            {[40, 100, 200, 250].map((x, i) => (
              <circle key={i} cx={x} cy={40 + (i % 2) * 12} r={6} fill="#3B2A20" opacity="0.5" />
            ))}
          </svg>

          {locations.map((loc) => (
            <div key={loc.id} style={{ position: "absolute", left: `${loc.x}%`, top: `${loc.y}%`, transform: "translate(-50%,-100%)", textAlign: "center" }}>
              <MapPin size={26} color={COLORS.accent} fill={COLORS.accent} />
              <div style={{ color: COLORS.cream, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px", marginTop: -2 }}>{loc.name}</div>
            </div>
          ))}

          {pendingPin && (
            <div style={{ position: "absolute", left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: "translate(-50%,-100%)" }}>
              <MapPin size={26} color={COLORS.cream} />
            </div>
          )}
        </div>

        {pendingPin && (
          <div style={{ background: COLORS.panel, borderRadius: 12, padding: 16, marginTop: 14 }}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Range name"
              style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box" }}
            />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address (optional, for Maps link)"
              style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box" }}
            />
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)"
              style={{ width: "100%", marginBottom: 12, padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={savePin} disabled={!form.name.trim()} style={{ flex: 1 }}>
                Save Pin
              </Btn>
              <Btn variant="outline" onClick={() => setPendingPin(null)} style={{ flex: 1 }}>
                Cancel
              </Btn>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {!loading && locations.length === 0 && <div style={{ color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>No ranges pinned yet.</div>}
          {locations.map((loc) => (
            <div key={loc.id} style={{ background: COLORS.panel, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 14 }}>{loc.name}</div>
                  {loc.notes && <div style={{ color: COLORS.khaki, fontSize: 12, marginTop: 2 }}>{loc.notes}</div>}
                </div>
                <button onClick={() => removeLocation(loc.id)} style={{ background: "none", border: "none", color: COLORS.miss, cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              {loc.address && (
                <a href={mapsLink(loc.address)} target="_blank" rel="noreferrer" style={{ color: COLORS.accentSoft, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, textDecoration: "none" }}>
                  Open in Maps <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Stats ----------
function StatsScreen({ archer, onBack }) {
  const [rawHistory, setRawHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await storageGet("roundHistory", false, []);
      setRawHistory(Array.isArray(saved) ? saved : []);
      setLoading(false);
    })();
  }, []);

  const filtered = archer.name ? rawHistory.filter((r) => r.name === archer.name) : rawHistory;
  const history = filtered.length ? filtered : rawHistory;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg }}>
        <ScreenHeader title="Stats" onBack={onBack} />
        <div style={{ color: COLORS.khaki, textAlign: "center", padding: 40 }}>Loading…</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg }}>
        <ScreenHeader title="Stats" onBack={onBack} />
        <div style={{ color: COLORS.khaki, textAlign: "center", padding: 40 }}>
          No rounds recorded yet. Finish a round and it'll show up here.
        </div>
      </div>
    );
  }

  const highestScore = Math.max(...history.map((r) => r.total));
  const avgTotal = (history.reduce((s, r) => s + r.total, 0) / history.length).toFixed(1);

  let furthestDistance = 0;
  const byTarget = {};
  history.forEach((r) => {
    (r.ends || []).forEach((end) => {
      const d = Number(end.distance);
      if (!isNaN(d) && d > furthestDistance) furthestDistance = d;
      const key = end.targetId;
      if (!byTarget[key]) byTarget[key] = { sum: 0, count: 0 };
      end.scores.forEach((sc) => {
        byTarget[key].sum += sc;
        byTarget[key].count += 1;
      });
    });
  });

  const topRounds = [...history].sort((a, b) => b.total - a.total).slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <ScreenHeader title="Stats" onBack={onBack} />
      <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ color: COLORS.accentSoft, fontWeight: 900, fontSize: 24 }}>{highestScore}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>HIGHEST SCORE</div>
          </div>
          <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ color: COLORS.cream, fontWeight: 900, fontSize: 24 }}>{avgTotal}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>AVG TOTAL</div>
          </div>
          <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ color: COLORS.cream, fontWeight: 900, fontSize: 24 }}>{furthestDistance || "-"}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>FURTHEST DISTANCE (YDS)</div>
          </div>
          <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ color: COLORS.cream, fontWeight: 900, fontSize: 24 }}>{history.length}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>ROUNDS PLAYED</div>
          </div>
        </div>

        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Average by Target Style</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {Object.keys(byTarget).map((key) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panel, borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ color: COLORS.cream, fontSize: 13 }}>{key}</div>
              <div style={{ color: COLORS.accentSoft, fontWeight: 700, fontSize: 13 }}>{(byTarget[key].sum / byTarget[key].count).toFixed(1)} avg/arrow</div>
            </div>
          ))}
        </div>

        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Top 3 Rounds</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topRounds.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panel, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ color: COLORS.cream, fontSize: 13 }}>
                #{i + 1} · {new Date(r.date).toLocaleDateString()} · {r.bowType}
              </div>
              <div style={{ color: COLORS.accentSoft, fontWeight: 900 }}>{r.total}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Leaderboard / Leagues ----------
function LeaderboardScreen({ archer, onBack }) {
  const [tab, setTab] = useState("global");
  const [globalBoard, setGlobalBoard] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leagueBoard, setLeagueBoard] = useState([]);
  const [newLeague, setNewLeague] = useState({ name: "", location: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const board = await storageGet("leaderboard:global", true, []);
      setGlobalBoard(Array.isArray(board) ? board : []);
      const keys = await storageListKeys("leagues:", true);
      const sortedKeys = keys.sort().reverse();
      const items = [];
      for (const k of sortedKeys) {
        const v = await storageGet(k, true, null);
        if (v) items.push(v);
      }
      setLeagues(items);
      setLoading(false);
    })();
  }, []);

  async function addLeague() {
    if (!newLeague.name.trim()) return;
    const entry = { id: newId(), name: newLeague.name, location: newLeague.location, createdAt: Date.now() };
    await storageSet(`leagues:${entry.id}`, entry, true);
    setLeagues((prev) => [entry, ...prev]);
    setNewLeague({ name: "", location: "" });
  }

  async function openLeague(league) {
    setSelectedLeague(league);
    const board = await storageGet(`leaderboard:league:${league.id}`, true, []);
    setLeagueBoard(Array.isArray(board) ? board : []);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <ScreenHeader title="Leaderboard / Leagues" onBack={selectedLeague ? () => setSelectedLeague(null) : onBack} />
      <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: COLORS.khaki, fontSize: 12, marginBottom: 14 }}>
          This data is shared and visible to everyone using this app.
        </div>

        {!selectedLeague && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Pill label="Global" active={tab === "global"} onClick={() => setTab("global")} />
              <Pill label="Leagues" active={tab === "leagues"} onClick={() => setTab("leagues")} />
            </div>

            {tab === "global" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {globalBoard.length === 0 && <div style={{ color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>No scores submitted yet.</div>}
                {globalBoard.map((entry, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panel, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ color: COLORS.cream, fontSize: 13 }}>
                      #{i + 1} {entry.name} <span style={{ color: COLORS.khaki }}>· {entry.bowType}</span>
                    </div>
                    <div style={{ color: COLORS.accentSoft, fontWeight: 900 }}>{entry.score}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "leagues" && (
              <div>
                <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Add a League</div>
                  <input
                    value={newLeague.name}
                    onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                    placeholder="League name"
                    style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box" }}
                  />
                  <input
                    value={newLeague.location}
                    onChange={(e) => setNewLeague({ ...newLeague, location: e.target.value })}
                    placeholder="Location"
                    style={{ width: "100%", marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box" }}
                  />
                  <Btn onClick={addLeague} disabled={!newLeague.name.trim()} style={{ width: "100%" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Plus size={16} /> Create League
                    </span>
                  </Btn>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {!loading && leagues.length === 0 && <div style={{ color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>No leagues yet — create the first one.</div>}
                  {leagues.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => openLeague(l)}
                      style={{ background: COLORS.panel, border: `2px solid ${COLORS.panelSoft}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer" }}
                    >
                      <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                      {l.location && <div style={{ color: COLORS.khaki, fontSize: 12 }}>{l.location}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedLeague && (
          <div>
            <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{selectedLeague.name}</div>
            {selectedLeague.location && <div style={{ color: COLORS.khaki, fontSize: 13, marginBottom: 14 }}>{selectedLeague.location}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leagueBoard.length === 0 && <div style={{ color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>No scores submitted to this league yet.</div>}
              {leagueBoard.map((entry, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panel, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ color: COLORS.cream, fontSize: 13 }}>
                    #{i + 1} {entry.name} <span style={{ color: COLORS.khaki }}>· {entry.bowType}</span>
                  </div>
                  <div style={{ color: COLORS.accentSoft, fontWeight: 900 }}>{entry.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Open Range (social) ----------
function OpenRangeScreen({ archer, onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [draft, setDraft] = useState({ type: "General", text: "" });

  useEffect(() => {
    (async () => {
      const keys = await storageListKeys("posts:", true);
      const sortedKeys = keys.sort().reverse().slice(0, 40);
      const items = [];
      for (const k of sortedKeys) {
        const v = await storageGet(k, true, null);
        if (v) items.push(v);
      }
      setPosts(items);
      setLoading(false);
    })();
  }, []);

  async function submitPost() {
    if (!draft.text.trim()) return;
    const entry = {
      id: newId(),
      author: archer.name || "Archer",
      type: draft.type,
      text: draft.text.trim(),
      createdAt: Date.now(),
    };
    await storageSet(`posts:${entry.id}`, entry, true);
    setPosts((prev) => [entry, ...prev]);
    setDraft({ type: "General", text: "" });
  }

  const visible = filter === "All" ? posts : posts.filter((p) => p.type === filter);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <ScreenHeader title="Open Range" onBack={onBack} />
      <div style={{ padding: 18, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: COLORS.khaki, fontSize: 12, marginBottom: 14 }}>
          A shared message board — posts here are visible to everyone using this app.
        </div>

        <div style={{ background: COLORS.panel, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {["General", "Tip", "Question"].map((t) => (
              <Pill key={t} label={t} active={draft.type === t} onClick={() => setDraft({ ...draft, type: t })} />
            ))}
          </div>
          <textarea
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="Share a tip, ask a question, or say hi…"
            rows={3}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
          />
          <Btn onClick={submitPost} disabled={!draft.text.trim()} style={{ marginTop: 10, width: "100%" }}>
            Post
          </Btn>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["All", "General", "Tip", "Question"].map((t) => (
            <Pill key={t} label={t} active={filter === t} onClick={() => setFilter(t)} />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!loading && visible.length === 0 && <div style={{ color: COLORS.khaki, fontSize: 13, textAlign: "center" }}>No posts yet — be the first.</div>}
          {visible.map((p) => (
            <div key={p.id} style={{ background: COLORS.panel, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{p.author}</div>
                <div style={{ color: COLORS.accentSoft, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{p.type}</div>
              </div>
              <div style={{ color: COLORS.cream, fontSize: 13, lineHeight: 1.4 }}>{p.text}</div>
              <div style={{ color: COLORS.khaki, fontSize: 11, marginTop: 6 }}>{new Date(p.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Archery app crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.cream, padding: 24, fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <h2 style={{ color: COLORS.accent, marginTop: 0 }}>Something went wrong</h2>
          <div style={{ color: COLORS.khaki, fontSize: 13, marginBottom: 12 }}>
            The app hit an unexpected error. The details below should help track it down.
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: COLORS.panel, padding: 12, borderRadius: 8, overflowX: "auto" }}>
            {String((this.state.error && this.state.error.message) || this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, background: COLORS.accent, color: COLORS.ink, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ArcheryApp />
    </ErrorBoundary>
  );
}

function ArcheryApp() {
  const [screen, setScreen] = useState("home");
  const [archer, setArcher] = useState({ name: "", bowType: "Compound" });
  const [players, setPlayers] = useState([{ id: newId(), name: "" }]);
  const [arrowMode, setArrowMode] = useState({ mode: "fixed", shootCount: 3, keepCount: 3 });
  const [ends, setEnds] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [currentPlayerArrows, setCurrentPlayerArrows] = useState({});
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [endNumber, setEndNumber] = useState(1);
  const [distance, setDistance] = useState("");

  useEffect(() => {
    (async () => {
      const saved = await storageGet("archerProfile", false, null);
      if (saved) setArcher((prev) => ({ ...prev, ...saved }));
    })();
  }, []);

  useEffect(() => {
    setPlayers((prev) => {
      if (prev.length === 1 && !prev[0].name && archer.name) {
        return [{ ...prev[0], name: archer.name }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archer.name]);

  function scoresForEnd(end, playerId) {
    return (end.playerArrows[playerId] || []).map((a) => a.score);
  }

  function completedPlayerTotal(playerId) {
    return ends.reduce((s, end) => s + computeEndTotal(arrowMode, scoresForEnd(end, playerId)), 0);
  }

  function currentEndPlayerTotal(playerId) {
    const scores = (currentPlayerArrows[playerId] || []).map((a) => a.score);
    return computeEndTotal(arrowMode, scores);
  }

  function playerRoundTotal(playerId) {
    return completedPlayerTotal(playerId) + currentEndPlayerTotal(playerId);
  }

  const playerTotals = {};
  players.forEach((p) => {
    playerTotals[p.id] = playerRoundTotal(p.id);
  });
  const combinedTotal = players.reduce((s, p) => s + playerTotals[p.id], 0);

  function startRound() {
    setEnds([]);
    setCurrentPlayerArrows({});
    setCurrentPlayerIndex(0);
    setCurrentTarget(null);
    setEndNumber(1);
    setDistance("");
    storageSet("archerProfile", archer, false);
    setScreen("target-select");
  }

  function pickTarget(t) {
    setCurrentTarget(t);
    setCurrentPlayerArrows({});
    setCurrentPlayerIndex(0);
    setScreen("scoring");
  }

  function addArrow(score, x, y) {
    const playerId = players[currentPlayerIndex].id;
    setCurrentPlayerArrows((prev) => {
      const existing = prev[playerId] || [];
      if (existing.length >= arrowMode.shootCount) return prev;
      return { ...prev, [playerId]: [...existing, { score, x, y }] };
    });
  }

  function undoArrow() {
    const playerId = players[currentPlayerIndex].id;
    setCurrentPlayerArrows((prev) => ({ ...prev, [playerId]: (prev[playerId] || []).slice(0, -1) }));
  }

  function nextPlayer() {
    setCurrentPlayerIndex((i) => Math.min(i + 1, players.length - 1));
  }

  function finishEnd() {
    const playerId = players[currentPlayerIndex].id;
    if ((currentPlayerArrows[playerId] || []).length === 0) return;
    setEnds((prev) => [...prev, { target: currentTarget, playerArrows: currentPlayerArrows, endNumber, distance }]);
    setCurrentPlayerArrows({});
    setCurrentPlayerIndex(0);
    setCurrentTarget(null);
    setEndNumber((n) => (Number(n) || 0) + 1);
    setScreen("target-select");
  }

  async function saveHistoryAndSummarize(finalEnds) {
    const history = await storageGet("roundHistory", false, []);
    const records = players.map((p) => ({
      id: newId(),
      date: new Date().toISOString(),
      name: p.name || "Archer",
      bowType: archer.bowType,
      arrowMode,
      total: finalEnds.reduce((s, end) => s + computeEndTotal(arrowMode, scoresForEnd(end, p.id)), 0),
      ends: finalEnds.map((e) => ({
        targetId: e.target.id,
        distance: e.distance,
        endNumber: e.endNumber,
        scores: scoresForEnd(e, p.id),
      })),
    }));
    const nextHistory = [...records, ...(Array.isArray(history) ? history : [])].slice(0, 400);
    await storageSet("roundHistory", nextHistory, false);
  }

  async function endRound() {
    let finalEnds = ends;
    const playerId = players[currentPlayerIndex].id;
    const hasCurrentArrows = Object.values(currentPlayerArrows).some((arr) => arr && arr.length > 0);
    if (currentTarget && hasCurrentArrows) {
      finalEnds = [...ends, { target: currentTarget, playerArrows: currentPlayerArrows, endNumber, distance }];
      setEnds(finalEnds);
      setCurrentPlayerArrows({});
    }
    await saveHistoryAndSummarize(finalEnds);
    setScreen("summary");
  }

  function newRound() {
    setEnds([]);
    setCurrentPlayerArrows({});
    setCurrentPlayerIndex(0);
    setCurrentTarget(null);
    setEndNumber(1);
    setDistance("");
    setScreen("home");
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {screen === "home" && (
        <HomeScreen
          archer={archer}
          setArcher={setArcher}
          onStartRound={() => setScreen("setup")}
          onLocations={() => setScreen("locations")}
          onStats={() => setScreen("stats")}
          onLeaderboard={() => setScreen("leaderboard")}
          onOpenRange={() => setScreen("openrange")}
        />
      )}

      {screen === "setup" && (
        <SetupScreen
          archer={archer}
          setArcher={setArcher}
          players={players}
          setPlayers={setPlayers}
          arrowMode={arrowMode}
          setArrowMode={setArrowMode}
          onStart={startRound}
        />
      )}

      {screen === "locations" && <LocationsScreen onBack={() => setScreen("home")} />}
      {screen === "stats" && <StatsScreen archer={archer} onBack={() => setScreen("home")} />}
      {screen === "leaderboard" && <LeaderboardScreen archer={archer} onBack={() => setScreen("home")} />}
      {screen === "openrange" && <OpenRangeScreen archer={archer} onBack={() => setScreen("home")} />}

      {screen === "target-select" && (
        <TargetSelectScreen
          archer={archer}
          players={players}
          playerTotals={playerTotals}
          roundTotal={combinedTotal}
          endNumber={endNumber}
          setEndNumber={setEndNumber}
          distance={distance}
          setDistance={setDistance}
          onPick={pickTarget}
          onEndRound={endRound}
          canGoBack={false}
        />
      )}

      {screen === "scoring" && currentTarget && (
        <ScoringScreen
          archer={archer}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          target={currentTarget}
          currentPlayerArrows={currentPlayerArrows}
          arrowMode={arrowMode}
          addArrow={addArrow}
          undoArrow={undoArrow}
          onNextPlayer={nextPlayer}
          playerTotals={playerTotals}
          roundTotal={combinedTotal}
          onFinishEnd={finishEnd}
          onEndRound={endRound}
          endNumber={endNumber}
          setEndNumber={setEndNumber}
          distance={distance}
          setDistance={setDistance}
        />
      )}

      {screen === "summary" && (
        <SummaryScreen
          archer={archer}
          players={players}
          ends={ends}
          arrowMode={arrowMode}
          onNewRound={newRound}
          onExport={() => setScreen("scorecard")}
        />
      )}

      {screen === "scorecard" && (
        <ScorecardScreen archer={archer} players={players} ends={ends} arrowMode={arrowMode} onBack={() => setScreen("summary")} />
      )}
    </div>
  );
}