
import React, { useState, useRef } from "react";
import { ChevronLeft, RotateCcw, Trophy, Check } from "lucide-react";

// ---------- Design tokens ----------
const COLORS = {
  bg: "#182B1D", // deep field green (background)
  panel: "#22391E", // slightly lighter panel green
  panelSoft: "#2C4526",
  cream: "#F3ECD9", // range paper cream
  khaki: "#C7B78E", // dirt/khaki
  accent: "#FF6A21", // blaze orange
  accentSoft: "#FFB07A",
  ink: "#16210F", // near-black text
  miss: "#8B3A3A",
};

const RING_TARGETS = [
  { id: "3-Ring", rings: 3 },
  { id: "5-Ring", rings: 5 },
  { id: "7-Ring", rings: 7 },
];

const ANIMAL_TARGETS = ["Deer", "Fish", "Possum", "Raccoon", "Bear"];

const ALL_TARGETS = [
  ...RING_TARGETS.map((r) => ({ id: r.id, kind: "ring", rings: r.rings })),
  ...ANIMAL_TARGETS.map((a) => ({ id: a, kind: "animal" })),
];

// ---------- Helpers ----------
function ringColor(distFromCenter) {
  if (distFromCenter === 0) return COLORS.accent;
  return distFromCenter % 2 === 1 ? COLORS.cream : COLORS.panelSoft;
}

function buildScorecardText(archer, ends, roundTotal) {
  const date = new Date().toLocaleDateString();
  const totalArrows = ends.reduce((s, e) => s + e.arrows.length, 0);
  const avg = totalArrows ? (roundTotal / totalArrows).toFixed(1) : "0.0";
  let lines = [];
  lines.push("ARCHERY SCORECARD");
  lines.push(`Archer: ${archer.name || "Archer"}`);
  lines.push(`Bow: ${archer.bowType}`);
  lines.push(`Arrows/Target: ${archer.arrowsPerEnd}`);
  lines.push(`Date: ${date}`);
  lines.push("");
  ends.forEach((end, i) => {
    const total = end.arrows.reduce((s, a) => s + a.score, 0);
    const dist = end.distance !== "" && end.distance != null ? `${end.distance}yds` : "-";
    lines.push(`Target ${end.endNumber ?? i + 1} (${end.target.id}, ${dist}): ${end.arrows.map((a) => a.score).join(", ")} = ${total}`);
  });
  lines.push("");
  lines.push(`TOTAL SCORE: ${roundTotal}`);
  lines.push(`AVERAGE PER ARROW: ${avg}`);
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

function AnimalTarget({ animal, size = 300, interactive = true, onScore, arrows = [] }) {
  const svgRef = useRef(null);
  const tap = useTapScore(svgRef, onScore || (() => {}));
  return (
    <svg ref={svgRef} viewBox="0 0 300 300" width={size} height={size} style={{ touchAction: "manipulation" }}>
      {animal === "Fish" ? (
        <FishTarget interactive={interactive} tap={tap} />
      ) : (
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
function SetupScreen({ archer, setArcher, onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ color: COLORS.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.25em", marginBottom: 6 }}>SIMPLE SCOREKEEPING</div>
      <h1 style={{ color: COLORS.cream, fontSize: 32, fontWeight: 900, letterSpacing: "0.02em", margin: "0 0 30px", textAlign: "center" }}>
        ROUND SETUP
      </h1>

      <div style={{ width: "100%", maxWidth: 380, background: COLORS.panel, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>YOUR NAME</label>
          <input
            value={archer.name}
            onChange={(e) => setArcher({ ...archer, name: e.target.value })}
            placeholder="Enter your name"
            style={{ width: "100%", marginTop: 8, padding: "12px 14px", borderRadius: 10, border: `2px solid ${COLORS.panelSoft}`, background: COLORS.bg, color: COLORS.cream, fontSize: 15, boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>BOW TYPE</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["Compound", "Recurve", "Traditional"].map((b) => (
              <Pill key={b} label={b} active={archer.bowType === b} onClick={() => setArcher({ ...archer, bowType: b })} />
            ))}
          </div>
        </div>

        <div>
          <label style={{ color: COLORS.khaki, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>ARROWS PER TARGET</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[1, 3, 5, 6].map((n) => (
              <Pill key={n} label={String(n)} active={archer.arrowsPerEnd === n} onClick={() => setArcher({ ...archer, arrowsPerEnd: n })} />
            ))}
          </div>
        </div>

        <Btn onClick={onStart} style={{ marginTop: 6, width: "100%" }}>
          Confirm & Start
        </Btn>
      </div>
    </div>
  );
}

function TargetSelectScreen({ archer, roundTotal, endNumber, setEndNumber, distance, setDistance, onPick, onEndRound, canGoBack, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <TopBar archer={archer} roundTotal={roundTotal} endLabel={`Choose target`} onBack={canGoBack ? onBack : null} onEndRound={onEndRound} />
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

function ScoringScreen({ archer, target, arrows, addArrow, undoArrow, endTotal, roundTotal, onFinishEnd, onEndRound, endNumber, setEndNumber, distance, setDistance }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      <TopBar
        archer={archer}
        roundTotal={roundTotal}
        endLabel={`${target.id} — Arrow ${Math.min(arrows.length + 1, archer.arrowsPerEnd)} of ${archer.arrowsPerEnd}`}
      />
      <EndSettingsBar endNumber={endNumber} setEndNumber={setEndNumber} distance={distance} setDistance={setDistance} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
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
          <Btn disabled={arrows.length === 0} onClick={onFinishEnd} style={{ flex: 1 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Check size={16} /> Next Target
            </span>
          </Btn>
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

function ShareMenu({ archer, roundTotal, onClose }) {
  const [status, setStatus] = useState("");
  const shareText = `I scored ${roundTotal} points in my archery round with my ${archer.bowType.toLowerCase()}! 🎯🏹`;
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

function SummaryScreen({ archer, ends, roundTotal, onNewRound, onExport }) {
  const [shareOpen, setShareOpen] = useState(false);
  const totalArrows = ends.reduce((s, e) => s + e.arrows.length, 0);
  const avg = totalArrows ? (roundTotal / totalArrows).toFixed(1) : "0.0";
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Trophy size={40} color={COLORS.accent} />
      <h1 style={{ color: COLORS.cream, fontSize: 26, fontWeight: 900, margin: "10px 0 2px" }}>ROUND COMPLETE</h1>
      <div style={{ color: COLORS.khaki, marginBottom: 20 }}>{archer.name || "Archer"} · {archer.bowType}</div>

      <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ color: COLORS.accentSoft, fontWeight: 900, fontSize: 30 }}>{roundTotal}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>TOTAL SCORE</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: COLORS.cream, fontWeight: 900, fontSize: 30 }}>{avg}</div>
            <div style={{ color: COLORS.khaki, fontSize: 11 }}>AVG / ARROW</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ends.map((end, i) => {
            const total = end.arrows.reduce((s, a) => s + a.score, 0);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelSoft, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>
                  Target {end.endNumber ?? i + 1} · {end.target.id}
                  {end.distance !== "" && end.distance != null && (
                    <span style={{ color: COLORS.khaki, fontWeight: 500 }}> · {end.distance} yds</span>
                  )}
                </div>
                <div style={{ color: COLORS.cream, fontSize: 12, opacity: 0.8 }}>
                  {end.arrows.map((a) => a.score).join(" · ")}
                </div>
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
      </div>

      {shareOpen && <ShareMenu archer={archer} roundTotal={roundTotal} onClose={() => setShareOpen(false)} />}

      <Btn variant="ghost" onClick={onNewRound} style={{ marginTop: 20 }}>
        Start New Round
      </Btn>
    </div>
  );
}

function ScorecardScreen({ archer, ends, roundTotal, onBack }) {
  const totalArrows = ends.reduce((s, e) => s + e.arrows.length, 0);
  const avg = totalArrows ? (roundTotal / totalArrows).toFixed(1) : "0.0";
  const date = new Date().toLocaleDateString();
  const scorecardText = buildScorecardText(archer, ends, roundTotal);
  const paper = "#FBF7EE";
  const ink = "#1B2A1E";
  const rule = "#C9B896";

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Archery Scorecard - ${archer.name || "Archer"} - ${date}`);
    const body = encodeURIComponent(scorecardText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`@media print { .no-print { display: none !important; } .print-sheet { box-shadow: none !important; margin: 0 !important; } body { background: white !important; } }`}</style>

      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 18, width: "100%", maxWidth: 480 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.khaki, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
          <ChevronLeft size={20} /> Back
        </button>
      </div>

      <div className="print-sheet" style={{ background: paper, color: ink, width: "100%", maxWidth: 480, borderRadius: 8, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", borderBottom: `2px solid ${ink}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", fontWeight: 700, opacity: 0.7 }}>OFFICIAL</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.04em" }}>ARCHERY SCORECARD</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 18 }}>
          <div><strong>Archer:</strong> {archer.name || "Archer"}</div>
          <div><strong>Date:</strong> {date}</div>
          <div><strong>Bow Type:</strong> {archer.bowType}</div>
          <div><strong>Arrows/Target:</strong> {archer.arrowsPerEnd}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${ink}`, textAlign: "left" }}>
              <th style={{ padding: "6px 4px" }}>Tgt</th>
              <th style={{ padding: "6px 4px" }}>Type</th>
              <th style={{ padding: "6px 4px" }}>Dist</th>
              <th style={{ padding: "6px 4px" }}>Arrows</th>
              <th style={{ padding: "6px 4px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ends.map((end, i) => {
              const total = end.arrows.reduce((s, a) => s + a.score, 0);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${rule}` }}>
                  <td style={{ padding: "6px 4px" }}>{end.endNumber ?? i + 1}</td>
                  <td style={{ padding: "6px 4px" }}>{end.target.id}</td>
                  <td style={{ padding: "6px 4px" }}>{end.distance !== "" && end.distance != null ? `${end.distance}yd` : "-"}</td>
                  <td style={{ padding: "6px 4px" }}>{end.arrows.map((a) => a.score).join(", ")}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 700 }}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${ink}`, paddingTop: 12, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>AVG / ARROW</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{avg}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>TOTAL SCORE</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{roundTotal}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
          <div>Archer Signature: ________________________</div>
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

// ---------- App ----------
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [archer, setArcher] = useState({ name: "", bowType: "Compound", arrowsPerEnd: 3 });
  const [ends, setEnds] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [currentArrows, setCurrentArrows] = useState([]);
  const [endNumber, setEndNumber] = useState(1);
  const [distance, setDistance] = useState("");

  const completedTotal = ends.reduce((s, e) => s + e.arrows.reduce((s2, a) => s2 + a.score, 0), 0);
  const endTotal = currentArrows.reduce((s, a) => s + a.score, 0);
  const roundTotal = completedTotal + endTotal;

  function startRound() {
    setEnds([]);
    setCurrentArrows([]);
    setCurrentTarget(null);
    setEndNumber(1);
    setDistance("");
    setScreen("target-select");
  }

  function pickTarget(t) {
    setCurrentTarget(t);
    setCurrentArrows([]);
    setScreen("scoring");
  }

  function addArrow(score, x, y) {
    setCurrentArrows((prev) => {
      if (prev.length >= archer.arrowsPerEnd) return prev;
      return [...prev, { score, x, y }];
    });
  }

  function undoArrow() {
    setCurrentArrows((prev) => prev.slice(0, -1));
  }

  function finishEnd() {
    if (currentArrows.length === 0) return;
    setEnds((prev) => [...prev, { target: currentTarget, arrows: currentArrows, endNumber, distance }]);
    setCurrentArrows([]);
    setCurrentTarget(null);
    setEndNumber((n) => (Number(n) || 0) + 1);
    setScreen("target-select");
  }

  function endRound() {
    if (currentArrows.length > 0 && currentTarget) {
      setEnds((prev) => [...prev, { target: currentTarget, arrows: currentArrows, endNumber, distance }]);
      setCurrentArrows([]);
    }
    setScreen("summary");
  }

  function newRound() {
    setEnds([]);
    setCurrentArrows([]);
    setCurrentTarget(null);
    setEndNumber(1);
    setDistance("");
    setScreen("setup");
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {screen === "setup" && <SetupScreen archer={archer} setArcher={setArcher} onStart={startRound} />}

      {screen === "target-select" && (
        <TargetSelectScreen
          archer={archer}
          roundTotal={roundTotal}
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
          target={currentTarget}
          arrows={currentArrows}
          addArrow={addArrow}
          undoArrow={undoArrow}
          endTotal={endTotal}
          roundTotal={roundTotal}
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
          ends={ends}
          roundTotal={roundTotal}
          onNewRound={newRound}
          onExport={() => setScreen("scorecard")}
        />
      )}

      {screen === "scorecard" && (
        <ScorecardScreen archer={archer} ends={ends} roundTotal={roundTotal} onBack={() => setScreen("summary")} />
      )}
    </div>
  );
}
