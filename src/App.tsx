import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Building2, CircleHelp, Cloud, Download, Eraser, Grid3X3,
  Home, Layers, Map, Minus, MousePointer2, Plus, Redo2, Save, Settings2,
  Trees, Undo2, Waves, Zap
} from "lucide-react";

type TileKind = "empty" | "road" | "residential" | "commercial" | "industrial" | "park" | "water";
type Tile = { kind: TileKind };
type Tool = TileKind | "select";
const COLS = 44;
const ROWS = 30;
const TILE = 28;
const STORAGE_KEY = "cityplanner-project-v1";

const palette: { id: Tool; label: string; icon: typeof Map; color?: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "road", label: "Roads", icon: Map, color: "#59636b" },
  { id: "residential", label: "Residential", icon: Home, color: "#86b99b" },
  { id: "commercial", label: "Commercial", icon: Building2, color: "#e5bd79" },
  { id: "industrial", label: "Industrial", icon: Zap, color: "#c58d82" },
  { id: "park", label: "Parks", icon: Trees, color: "#5e9b77" },
  { id: "water", label: "Water", icon: Waves, color: "#75aeca" },
  { id: "empty", label: "Erase", icon: Eraser },
];

function makeWorld(): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < COLS; x++) {
      const edge = x < 2 || y < 2 || x > COLS - 3 || y > ROWS - 3;
      const lake = (x - 34) ** 2 / 80 + (y - 8) ** 2 / 28 < 1;
      const river = Math.abs(x - (10 + Math.sin(y / 4) * 3)) < 1.15 && y > 8 && y < 28;
      row.push({ kind: edge || lake || river ? "water" : "empty" });
    }
    grid.push(row);
  }
  return grid;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<Tile[][]>(() => makeWorld());
  const [tool, setTool] = useState<Tool>("road");
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 80, y: 55 });
  const [cityName, setCityName] = useState("New City");
  const [saved, setSaved] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [panning, setPanning] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [history, setHistory] = useState<Tile[][][]>([]);
  const [future, setFuture] = useState<Tile[][][]>([]);

  const counts = useMemo(() => {
    const result = { residential: 0, commercial: 0, industrial: 0, park: 0, road: 0 };
    grid.flat().forEach(t => { if (t.kind in result) result[t.kind as keyof typeof result]++; });
    return result;
  }, [grid]);

  const paint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((clientX - rect.left - offset.x) / (TILE * zoom));
    const y = Math.floor((clientY - rect.top - offset.y) / (TILE * zoom));
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    setGrid(old => {
      if (old[y][x].kind === tool || (tool !== "water" && old[y][x].kind === "water")) return old;
      const next = old.map(row => row.map(cell => ({ ...cell })));
      next[y][x] = { kind: tool as TileKind };
      return next;
    });
    setSaved(false);
  }, [offset, zoom, tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#d9dfcf";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const kind = grid[y][x].kind;
        const px = x * TILE, py = y * TILE;
        const colors: Record<TileKind, string> = {
          empty: "#d9dfcf", road: "#59636b", residential: "#86b99b",
          commercial: "#e5bd79", industrial: "#c58d82", park: "#5e9b77", water: "#75aeca"
        };
        ctx.fillStyle = colors[kind];
        ctx.fillRect(px, py, TILE, TILE);
        if (kind === "empty") {
          ctx.fillStyle = "rgba(104,139,91,.10)";
          ctx.fillRect(px + 4, py + 4, 3, 3);
          ctx.fillRect(px + 18, py + 17, 2, 2);
        }
        if (kind === "road") {
          ctx.fillStyle = "#737d84";
          ctx.fillRect(px, py + 2, TILE, TILE - 4);
          ctx.fillStyle = "rgba(255,255,255,.45)";
          ctx.fillRect(px + TILE / 2 - 1, py + 3, 2, TILE - 6);
        }
        if (kind === "park") {
          ctx.fillStyle = "#3e805e";
          ctx.beginPath(); ctx.arc(px + 14, py + 14, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (kind === "water") {
          ctx.strokeStyle = "rgba(255,255,255,.25)";
          ctx.beginPath(); ctx.moveTo(px + 4, py + 9); ctx.lineTo(px + 23, py + 9); ctx.stroke();
        }
        if (showGrid) {
          ctx.strokeStyle = "rgba(42,58,48,.14)";
          ctx.lineWidth = 0.6;
          ctx.strokeRect(px, py, TILE, TILE);
        }
      }
    }
    ctx.restore();
  }, [grid, offset, zoom, showGrid]);

  useEffect(() => {
    const handleResize = () => setOffset(v => ({ ...v }));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function startPaint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button === 1 || e.button === 2 || tool === "select") {
      setPanning(true);
      lastPointer.current = { x: e.clientX, y: e.clientY };
      return;
    }
    setHistory(h => [...h.slice(-19), grid]);
    setFuture([]);
    setDrawing(true);
    paint(e.clientX, e.clientY);
  }
  function movePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (panning) {
      const dx = e.clientX - lastPointer.current.x, dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      setOffset(v => ({ x: v.x + dx, y: v.y + dy }));
    } else if (drawing) paint(e.clientX, e.clientY);
  }
  function stopPointer() { setDrawing(false); setPanning(false); }
  function undo() {
    if (!history.length) return;
    setFuture(f => [grid, ...f]);
    setGrid(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setSaved(false);
  }
  function redo() {
    if (!future.length) return;
    setHistory(h => [...h, grid]);
    setGrid(future[0]);
    setFuture(f => f.slice(1));
    setSaved(false);
  }
  function saveProject() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, cityName }));
    setSaved(true);
  }
  function loadProject() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.grid) setGrid(data.grid);
      if (data.cityName) setCityName(data.cityName);
      setSaved(true);
    } catch { alert("The saved project could not be opened."); }
  }
  function exportProject() {
    const blob = new Blob([JSON.stringify({ version: 1, cityName, grid }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.city.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function newCity() {
    if (!confirm("Start a new city? Unsaved changes will be lost.")) return;
    setGrid(makeWorld()); setCityName("New City"); setHistory([]); setFuture([]); setSaved(true); setOffset({ x: 80, y: 55 }); setZoom(1);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Map size={19}/></div><div><strong>CITYPLANNER</strong><span>FICTIONAL CITY STUDIO</span></div></div>
      <div className="project-name"><input value={cityName} onChange={e => { setCityName(e.target.value); setSaved(false); }} aria-label="City name"/><span className={saved ? "save-state" : "save-state dirty"}>{saved ? "All changes saved" : "Unsaved changes"}</span></div>
      <div className="top-actions"><button className="icon-button" title="Undo" onClick={undo} disabled={!history.length}><Undo2 size={17}/></button><button className="icon-button" title="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17}/></button><button className="secondary-button" onClick={loadProject}><Layers size={16}/> Open</button><button className="primary-button" onClick={saveProject}><Save size={16}/> Save</button></div>
    </header>
    <main className="workspace">
      <aside className="tool-panel">
        <div className="panel-heading"><span>BUILD TOOLS</span><Settings2 size={15}/></div>
        <div className="tool-list">{palette.map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={`tool-button ${tool === item.id ? "active" : ""}`} onClick={() => setTool(item.id)}>
            <span className="tool-icon" style={{ background: item.color || "#34414b" }}><Icon size={17}/></span><span>{item.label}</span>{tool === item.id && <span className="active-dot"/>}
          </button>;
        })}</div>
        <div className="panel-divider"/>
        <div className="panel-heading"><span>MAP OPTIONS</span></div>
        <button className="option-row" onClick={() => setShowGrid(v => !v)}><Grid3X3 size={16}/> Show grid <span className={`toggle ${showGrid ? "on" : ""}`}/></button>
        <div className="hint-card"><CircleHelp size={16}/><div><b>Quick tip</b><p>Choose a tool, then click or drag across the map to paint tiles. Select lets you pan the map.</p></div></div>
        <button className="new-city-button" onClick={newCity}>＋ New city</button>
      </aside>
      <section className="map-section">
        <div className="map-toolbar"><div className="breadcrumb"><span>Projects</span><ArrowUpRight size={13}/><b>{cityName || "Untitled City"}</b></div><div className="map-tools"><span className="tool-status"><i style={{ background: palette.find(p => p.id === tool)?.color || "#d5dcd2" }}/>{palette.find(p => p.id === tool)?.label} tool</span><button className="zoom-button" onClick={() => setZoom(z => Math.max(.5, Math.min(2.5, z - .1)))}><Minus size={15}/></button><span className="zoom-value">{Math.round(zoom * 100)}%</span><button className="zoom-button" onClick={() => setZoom(z => Math.max(.5, Math.min(2.5, z + .1)))}><Plus size={15}/></button><button className="zoom-button" title="Export project" onClick={exportProject}><Download size={15}/></button></div></div>
        <div className="map-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} onPointerDown={startPaint} onPointerMove={movePointer} onPointerUp={stopPointer} onPointerLeave={stopPointer} onContextMenu={e => e.preventDefault()} onWheel={e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => Math.max(.5, Math.min(2.5, z + (e.deltaY < 0 ? .08 : -.08)))); } }} />
          <div className="map-coordinates">FICTIONAL REGION · GRID {COLS} × {ROWS}</div>
          <div className="map-compass">N <span>↑</span></div>
          <div className="map-legend"><span><i className="legend-res"/>Residential</span><span><i className="legend-com"/>Commercial</span><span><i className="legend-ind"/>Industrial</span><span><i className="legend-park"/>Parks</span></div>
        </div>
        <div className="bottom-status"><span><i className="status-dot"/> Map ready</span><span>44 × 30 tiles</span><span>Scroll with Ctrl/⌘ to zoom · Select tool to pan</span></div>
      </section>
      <aside className="inspector">
        <div className="inspector-title"><div><span className="eyebrow">CITY OVERVIEW</span><h2>City statistics</h2></div><Cloud size={18}/></div>
        <div className="stat-card"><span>ESTIMATED POPULATION</span><strong>{(counts.residential * 24).toLocaleString()}</strong><small>Planning estimate · not simulated yet</small></div>
        <div className="stat-grid">
          <div className="mini-stat"><span>RESIDENTIAL</span><b>{counts.residential}</b><small>tiles</small></div>
          <div className="mini-stat"><span>COMMERCIAL</span><b>{counts.commercial}</b><small>tiles</small></div>
          <div className="mini-stat"><span>INDUSTRIAL</span><b>{counts.industrial}</b><small>tiles</small></div>
          <div className="mini-stat"><span>ROAD NETWORK</span><b>{counts.road}</b><small>tiles</small></div>
        </div>
        <div className="panel-divider"/>
        <div className="inspector-section"><h3>Land use mix</h3>
          {(["residential", "commercial", "industrial", "park"] as const).map(k => {
            const total = counts.residential + counts.commercial + counts.industrial + counts.park || 1;
            const labels = { residential: "Residential", commercial: "Commercial", industrial: "Industrial", park: "Parks" };
            return <div className="mix-row" key={k}><div><span>{labels[k]}</span><b>{Math.round(counts[k] / total * 100)}%</b></div><div className="mix-track"><i className={`mix-${k}`} style={{ width: `${counts[k] / total * 100}%` }}/></div></div>;
          })}
        </div>
        <div className="coming-soon"><span className="coming-icon"><Zap size={17}/></span><div><b>Simulation engine</b><p>Demand, traffic, budgets, and service coverage will arrive in a later phase.</p><em>COMING IN PHASE 2</em></div></div>
      </aside>
    </main>
    <footer className="footer"><span>CityPlanner <b>v0.1.0</b></span><span>Fictional City Studio · Your city, your rules.</span><button onClick={exportProject}>Export project <Download size={13}/></button></footer>
  </div>;
}