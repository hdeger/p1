import { useState, useMemo } from "react";

const HOSE_PRESETS = [
  { label: "25mm", diameter: 25, C: 120 },
  { label: "38mm", diameter: 38, C: 120 },
  { label: "52mm", diameter: 52, C: 120 },
  { label: "65mm", diameter: 65, C: 120 },
  { label: "75mm", diameter: 75, C: 120 },
  { label: "100mm", diameter: 100, C: 130 },
];

// Hazen-Williams Formula
// hf (m) = 10.67 × L × Q^1.852 / (C^1.852 × D^4.87)
// Q in m³/s, D in m, L in m → hf in m
// Pressure (bar) = hf / 10.197
function calcPressureLoss({ Q_lpm, D_mm, L_m, C }) {
  const Q = Q_lpm / 1000 / 60; // L/min → m³/s
  const D = D_mm / 1000; // mm → m
  const hf = 10.67 * L_m * Math.pow(Q, 1.852) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));
  const pressure_bar = hf / 10.197;
  const velocity = Q / (Math.PI * Math.pow(D / 2, 2)); // m/s
  return { hf, pressure_bar, velocity };
}

function GaugeArc({ value, max, color }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 240 - 120; // -120 to 120 degrees
  const rad = (angle * Math.PI) / 180;
  const r = 80;
  const cx = 100, cy = 110;
  const startAngle = (-120 * Math.PI) / 180;
  const endAngle = (120 * Math.PI) / 180;
  const arcPath = (start, end) => {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const fillEnd = startAngle + pct * (endAngle - startAngle);
  const needleX = cx + 55 * Math.cos(rad);
  const needleY = cy + 55 * Math.sin(rad);

  return (
    <svg viewBox="0 0 200 150" className="w-full max-w-xs mx-auto">
      {/* Background arc */}
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#1a1a2e" strokeWidth="14" strokeLinecap="round" />
      {/* Colored fill arc */}
      {pct > 0 && (
        <path d={arcPath(startAngle, fillEnd)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = startAngle + t * (endAngle - startAngle);
        const x1 = cx + 68 * Math.cos(a), y1 = cy + 68 * Math.sin(a);
        const x2 = cx + 80 * Math.cos(a), y2 = cy + 80 * Math.sin(a);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#444" strokeWidth="2" />;
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#fff" />
      {/* Labels */}
      <text x={cx} y={cy - 20} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="monospace">
        {value.toFixed(2)}
      </text>
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">
        bar
      </text>
    </svg>
  );
}

function RangeSlider({ label, value, min, max, step, unit, onChange, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: "#aab4c8", fontSize: 12, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
        <span style={{ color: "#fff", fontSize: 15, fontFamily: "monospace", fontWeight: 700 }}>
          {value} <span style={{ color: "#f97316", fontSize: 11 }}>{unit}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "#1e2540" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          transition: "width 0.1s"
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            width: "100%", margin: 0, opacity: 0, cursor: "pointer", height: 20
          }}
        />
      </div>
      <div className="flex justify-between" style={{ color: "#555", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [diameter, setDiameter] = useState(65);
  const [flowRate, setFlowRate] = useState(300);
  const [length, setLength] = useState(100);
  const [C, setC] = useState(120);

  const result = useMemo(() =>
    calcPressureLoss({ Q_lpm: flowRate, D_mm: diameter, L_m: length, C }),
    [diameter, flowRate, length, C]
  );

  const pressureColor = result.pressure_bar < 2 ? "#22c55e"
    : result.pressure_bar < 5 ? "#f97316"
    : "#ef4444";

  const maxGauge = 20;

  // Comparison table for different diameters
  const comparisonData = HOSE_PRESETS.map(p => ({
    ...p,
    result: calcPressureLoss({ Q_lpm: flowRate, D_mm: p.diameter, L_m: length, C: p.C })
  }));

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070b18",
      fontFamily: "monospace",
      color: "#fff",
      padding: "0",
      overflow: "hidden auto"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1629 0%, #1a0a0a 100%)",
        borderBottom: "2px solid #f9731620",
        padding: "24px 32px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "linear-gradient(135deg, #f97316, #dc2626)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 0 20px #f9731650"
          }}>🔥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>
              HORTUM BASINÇ KAYBI
            </div>
            <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 3, marginTop: 2 }}>
              HAZEN-WILLIAMS YÖNTEMİ
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Left: Controls */}
          <div style={{
            background: "#0d1120",
            border: "1px solid #1e2540",
            borderRadius: 16,
            padding: "24px 22px"
          }}>
            <div style={{ color: "#f97316", fontSize: 11, letterSpacing: 3, marginBottom: 20 }}>
              ▶ GİRİŞ PARAMETRELERİ
            </div>

            {/* Preset diameter buttons */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ color: "#aab4c8", fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                Hızlı Çap Seçimi
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {HOSE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setDiameter(p.diameter); setC(p.C); }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: diameter === p.diameter ? "1.5px solid #f97316" : "1.5px solid #1e2540",
                      background: diameter === p.diameter ? "#f9731620" : "#111827",
                      color: diameter === p.diameter ? "#f97316" : "#666",
                      fontSize: 12, cursor: "pointer", fontFamily: "monospace",
                      transition: "all 0.15s"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <RangeSlider label="Hortum Çapı" value={diameter} min={20} max={150} step={1} unit="mm" onChange={setDiameter} color="#f97316" />
            <RangeSlider label="Debi (Akış Hızı)" value={flowRate} min={50} max={2000} step={10} unit="L/dak" onChange={setFlowRate} color="#38bdf8" />
            <RangeSlider label="Hortum Uzunluğu" value={length} min={10} max={500} step={5} unit="m" onChange={setLength} color="#a78bfa" />
            <RangeSlider label="Pürüzlülük Katsayısı (C)" value={C} min={80} max={150} step={1} unit="" onChange={setC} color="#34d399" />

            <div style={{
              marginTop: 8,
              padding: "12px 14px",
              background: "#090d1a",
              borderRadius: 10,
              border: "1px solid #1e2540",
              fontSize: 11,
              color: "#555",
              lineHeight: 1.8
            }}>
              <span style={{ color: "#f97316" }}>C katsayısı:</span> Lastik/kauçuk: 110-120 · Metal/alüminyum: 120-140 · Yeni boru: 140-150
            </div>
          </div>

          {/* Right: Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Gauge */}
            <div style={{
              background: "#0d1120",
              border: `1px solid ${pressureColor}30`,
              borderRadius: 16,
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{ color: "#aab4c8", fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>
                ▶ BASINÇ KAYBI
              </div>

              <style>{`
                @keyframes pulseBorder {
                  0%, 100% { box-shadow: 0 0 0px ${pressureColor}00; }
                  50% { box-shadow: 0 0 30px ${pressureColor}40; }
                }
              `}</style>

              <div style={{
                borderRadius: 12, padding: "4px 0",
                animation: result.pressure_bar > 7 ? "pulseBorder 1.5s infinite" : "none"
              }}>
                <GaugeArc value={result.pressure_bar} max={maxGauge} color={pressureColor} />
              </div>

              <div style={{ fontSize: 11, color: pressureColor, letterSpacing: 2, marginTop: 4 }}>
                {result.pressure_bar < 2 ? "✓ DÜŞÜK KAYIP" : result.pressure_bar < 5 ? "⚠ ORTA KAYIP" : "✗ YÜKSEK KAYIP"}
              </div>
            </div>

            {/* Stat boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Manometrik Yük", value: result.hf.toFixed(2), unit: "m-SS", color: "#38bdf8" },
                { label: "Akış Hızı", value: result.velocity.toFixed(2), unit: "m/s", color: "#a78bfa", warn: result.velocity > 3.5 },
                { label: "Akış Debisi", value: flowRate, unit: "L/dak", color: "#34d399" },
                { label: "Hortum Çapı", value: diameter, unit: "mm", color: "#f97316" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#0d1120",
                  border: `1px solid ${s.warn ? "#ef4444" : "#1e2540"}`,
                  borderRadius: 12, padding: "14px 16px",
                  position: "relative", overflow: "hidden"
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: s.warn ? "#ef4444" : s.color
                  }} />
                  <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {s.value}
                    <span style={{ color: s.color, fontSize: 11, marginLeft: 4 }}>{s.unit}</span>
                  </div>
                  {s.warn && <div style={{ color: "#ef4444", fontSize: 9, marginTop: 2 }}>⚠ Hız sınırı aşıldı!</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div style={{
          marginTop: 20,
          background: "#0d1120",
          border: "1px solid #1e2540",
          borderRadius: 16,
          padding: "20px 22px"
        }}>
          <div style={{ color: "#f97316", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>
            ▶ ÇAPA GÖRE KARŞILAŞTIRMA — {flowRate} L/dak · {length} m
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Çap", "Basinç Kaybı", "Manometrik Yük", "Akış Hızı", "Durum"].map(h => (
                    <th key={h} style={{ color: "#555", fontWeight: 400, textAlign: "left", padding: "6px 12px", borderBottom: "1px solid #1e2540", letterSpacing: 1 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => {
                  const isActive = row.diameter === diameter;
                  const col = row.result.pressure_bar < 2 ? "#22c55e" : row.result.pressure_bar < 5 ? "#f97316" : "#ef4444";
                  const barW = Math.min((row.result.pressure_bar / 15) * 100, 100);
                  return (
                    <tr key={i} style={{
                      background: isActive ? "#f9731610" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s"
                    }}
                      onClick={() => { setDiameter(row.diameter); setC(row.C); }}
                    >
                      <td style={{ padding: "10px 12px", color: isActive ? "#f97316" : "#aab4c8", fontWeight: isActive ? 700 : 400 }}>
                        {isActive ? "▶ " : ""}{row.label}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "#1e2540", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${barW}%`, height: "100%", background: col, borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ color: col, minWidth: 50, textAlign: "right" }}>
                            {row.result.pressure_bar.toFixed(3)} bar
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#aab4c8" }}>{row.result.hf.toFixed(2)} m</td>
                      <td style={{ padding: "10px 12px", color: row.result.velocity > 3.5 ? "#ef4444" : "#aab4c8" }}>
                        {row.result.velocity.toFixed(2)} m/s
                      </td>
                      <td style={{ padding: "10px 12px", color: col, fontSize: 11 }}>
                        {row.result.pressure_bar < 2 ? "✓ İYİ" : row.result.pressure_bar < 5 ? "⚠ KABUL" : "✗ YÜKSEK"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formula box */}
        <div style={{
          marginTop: 16,
          padding: "14px 20px",
          background: "#080c18",
          border: "1px solid #1e2540",
          borderRadius: 12,
          fontSize: 11,
          color: "#444",
          lineHeight: 2
        }}>
          <span style={{ color: "#f97316" }}>Hazen-Williams Formülü: </span>
          <span style={{ color: "#666" }}>hf = 10.67 × L × Q</span>
          <sup style={{ color: "#666" }}>1.852</sup>
          <span style={{ color: "#666" }}> / (C</span>
          <sup style={{ color: "#666" }}>1.852</sup>
          <span style={{ color: "#666" }}> × D</span>
          <sup style={{ color: "#666" }}>4.87</sup>
          <span style={{ color: "#666" }}>)  →  Basınç (bar) = hf / 10.197</span>
          <span style={{ color: "#333", marginLeft: 16 }}>| Q: m³/s · D: m · L: m · hf: m</span>
        </div>
      </div>
    </div>
  );
}
