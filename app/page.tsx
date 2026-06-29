"use client";

import { useState, useEffect } from "react";
import { FactoryScene } from "@/components/FactoryScene";

interface FactoryStats {
  triangles: number;
  vertices: number;
  meshes: number;
}

export default function FactoryViewerPage() {
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);

  // State for simulated error (pulsing warnings on Extruder/Loom)
  const [simulatedError, setSimulatedError] = useState(false);

  // State for collapsible sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State for tracked hovered part
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [hoveredSpecificPart, setHoveredSpecificPart] = useState<string | null>(null);

  const [stats, setStats] = useState<FactoryStats>({
    triangles: 0,
    vertices: 0,
    meshes: 0,
  });

  const [fps, setFps] = useState(60);

  // Custom FPS Counter to show real-time performance inside the HUD
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let animationFrameId: number;

    const calculateFps = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(calculateFps);
    };

    animationFrameId = requestAnimationFrame(calculateFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col bg-[#090d16] text-white overflow-hidden font-sans relative">
      {/* Decorative Glowing Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />

      {/* 1. Header Bar (Full width, fixed height) */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div>
          <h1 className="text-sm md:text-base font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent flex items-center gap-1.5">
            <span>🏭</span> Polypack Plant 3D Viewer
          </h1>
        </div>

        {/* Action Controls & Simulator Status */}
        <div className="flex items-center gap-3">
          {/* Render engine / status stats */}
          <div className="flex items-center gap-3.5 bg-slate-900/80 border border-slate-800/50 px-3 py-1 rounded-lg">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Render engine</span>
              <span className={`text-[11px] font-mono font-bold ${fps >= 55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {fps} FPS
              </span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Status</span>
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${simulatedError ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                {simulatedError ? 'Warning' : 'Nominal'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace (Full Width, Split Sidebar & Canvas) */}
      <div className="flex-grow flex w-full overflow-hidden z-10 relative">

        {/* Sidebar Transition Container */}
        <div className={`relative transition-all duration-300 ease-in-out flex-shrink-0 z-20 ${
          isSidebarCollapsed ? 'w-0' : 'w-[350px]'
        }`}>
          <aside className={`h-full w-full border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-col gap-5 overflow-y-auto transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'p-0 border-r-0 opacity-0 pointer-events-none' : 'p-5 opacity-100'
          }`}>

          {/* Live Telemetry / Popover Detail HUD */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl h-[300px] flex flex-col shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <span>📋 Live Telemetry HUD</span>
            </h2>

            {hoveredPart ? (
              <div className="flex flex-col gap-3 font-sans transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      {hoveredPart === 'extruder' && '🌀 Tape Extrusion Line'}
                      {hoveredPart === 'looms' && (() => {
                        const num = hoveredSpecificPart ? (hoveredSpecificPart.match(/\d+/) || [''])[0] : '';
                        return `🕸️ Circular Loom #${num || 's'}`;
                      })()}
                      {hoveredPart === 'printer' && '🖨️ Flexographic Printer'}
                      {hoveredPart === 'sewing' && '✂️ Cutting & Sewing'}
                      {hoveredPart === 'warehouse' && '📦 Warehouse Storage'}
                    </h3>
                    <span className="text-[9px] text-slate-500 font-mono">Component ID: {
                      hoveredPart === 'looms' && hoveredSpecificPart
                        ? `LOOM_${(hoveredSpecificPart.match(/\d+/) || [''])[0]}_01`
                        : `${hoveredPart?.toUpperCase()}_01`
                    }</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${simulatedError && (
                      (hoveredPart === 'extruder' && hoveredSpecificPart && (
                        hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_barrel') ||
                        hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_heat_ring')
                      )) ||
                      (hoveredPart === 'looms' && hoveredSpecificPart?.includes('_4'))
                    )
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : simulatedError && hoveredPart === 'looms' && hoveredSpecificPart?.includes('_5')
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-450 border border-emerald-500/30'
                    }`}>
                    {simulatedError && (
                      (hoveredPart === 'extruder' && hoveredSpecificPart && (
                        hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_barrel') ||
                        hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_heat_ring')
                      )) ||
                      (hoveredPart === 'looms' && hoveredSpecificPart?.includes('_4'))
                    ) ? 'CRITICAL ERROR' :
                      simulatedError && hoveredPart === 'looms' && hoveredSpecificPart?.includes('_5') ? 'WARNING' :
                        'NOMINAL'}
                  </span>
                </div>

                <div className="h-px bg-slate-800/80 my-1" />

                {/* Machine specific variables */}
                <div className="flex flex-col gap-2 text-xs">
                  {hoveredPart === 'extruder' && (() => {
                    const isAffected = hoveredSpecificPart && (
                      hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_barrel') ||
                      hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_heat_ring')
                    );
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Extrusion Speed:</span>
                          <span className={`font-mono font-bold ${simulatedError && isAffected ? 'text-rose-400' : 'text-slate-200'}`}>
                            {simulatedError && isAffected ? '0.0 m/min' : '120.5 m/min'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hopper Melt Temp:</span>
                          <span className={`font-mono font-bold ${simulatedError && isAffected ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                            {simulatedError && isAffected ? '282°C (OVERHEAT)' : '240.2°C'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Line Throughput:</span>
                          <span className="text-slate-200 font-mono font-bold">
                            {simulatedError && isAffected ? '0 kg/hr' : '450 kg/hr'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {hoveredPart === 'looms' && (() => {
                    const isLoom4 = hoveredSpecificPart?.includes('_4');
                    const isLoom5 = hoveredSpecificPart?.includes('_5');
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Circular Speed:</span>
                          <span className={`font-mono font-bold ${simulatedError && isLoom4 ? 'text-rose-400' :
                              simulatedError && isLoom5 ? 'text-yellow-400' :
                                'text-slate-200'
                            }`}>
                            {simulatedError && isLoom4 ? '0 RPM' :
                              simulatedError && isLoom5 ? '420 RPM (Degraded)' :
                                '850 RPM'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Grid Efficiency:</span>
                          <span className={`font-mono font-bold ${simulatedError && isLoom4 ? 'text-rose-400' :
                              simulatedError && isLoom5 ? 'text-yellow-400' :
                                'text-slate-200'
                            }`}>
                            {simulatedError && isLoom4 ? '0.0%' :
                              simulatedError && isLoom5 ? '48.2%' :
                                '96.8%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Thread Tension:</span>
                          <span className={`font-mono font-bold ${simulatedError && isLoom4 ? 'text-rose-400 animate-pulse' :
                              simulatedError && isLoom5 ? 'text-yellow-400 animate-pulse' :
                                'text-slate-200'
                            }`}>
                            {simulatedError && isLoom4 ? '0.0 N (FAIL)' :
                              simulatedError && isLoom5 ? '6.8 N (LOW)' :
                                '14.5 N'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {hoveredPart === 'printer' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Press Print Speed:</span>
                        <span className="text-slate-200 font-mono font-bold">150.0 m/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Ink Bays:</span>
                        <span className="text-slate-200 font-mono font-bold">4 (Cyan, Mag, Yel, Blk)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Drying Temp:</span>
                        <span className="text-slate-200 font-mono font-bold">75.0°C</span>
                      </div>
                    </>
                  )}
                  {hoveredPart === 'sewing' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Conversion Rate:</span>
                        <span className="text-slate-200 font-mono font-bold">45 bags/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Conveyor Speed:</span>
                        <span className="text-slate-200 font-mono font-bold">0.85 m/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cutting Height:</span>
                        <span className="text-slate-200 font-mono font-bold">90.0 cm</span>
                      </div>
                    </>
                  )}
                  {hoveredPart === 'warehouse' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage Volume:</span>
                        <span className="text-slate-200 font-mono font-bold">85% Capacity</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stored Bag Bales:</span>
                        <span className="text-slate-200 font-mono font-bold">1,240 packages</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Forklifts:</span>
                        <span className="text-slate-200 font-mono font-bold">2 units</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/50 mt-1">
                  {hoveredPart === 'extruder' && (() => {
                    const isAffected = hoveredSpecificPart && (
                      hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_barrel') ||
                      hoveredSpecificPart.includes('Extruder_Line_ZoneB_1_heat_ring')
                    );
                    if (simulatedError) {
                      if (isAffected) return 'ALERT: Extruder #1 barrel heater report exceeded 280°C limit. Screw feed deactivated to prevent melt degradation.';
                      return 'Tape Extrusion Line #2 is operating normally under nominal heating parameters.';
                    }
                    const num = hoveredSpecificPart?.includes('ZoneB_2') ? '2' : '1';
                    return `Processes raw polypropylene granules through heaters, water cooling bath, stretcher godets, and bobbin winders (Line #${num} active).`;
                  })()}
                  {hoveredPart === 'looms' && (() => {
                    const isLoom4 = hoveredSpecificPart?.includes('_4');
                    const isLoom5 = hoveredSpecificPart?.includes('_5');
                    if (simulatedError) {
                      if (isLoom4) return 'ALERT: Loom #4 optical sensor triggered. Thread break occurred in the warp creel spool array. Standby mode.';
                      if (isLoom5) return 'ALERT: Loom #5 warp feed shuttle ring anomaly detected. Operating at degraded efficiency.';
                      return 'High-speed circular looms weave flat PP tapes from creels into continuous tubular fabric rolls (Nominal).';
                    }
                    const num = hoveredSpecificPart ? (hoveredSpecificPart.match(/\d+/) || [''])[0] : '';
                    return `High-speed circular looms weave flat PP tapes from creels into continuous tubular fabric rolls (Loom #${num || 's'} active).`;
                  })()}
                  {hoveredPart === 'printer' && 'Applies detailed multi-color printing designs, brand marks, and batch codes onto fabric rolls.'}
                  {hoveredPart === 'sewing' && 'Synchronized bottom-stitching and cutting line conversion spool fabric into single bags.'}
                  {hoveredPart === 'warehouse' && 'Organized concrete storage aisles with rotated racks holding yarn rolls, granule bins, and shipments.'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 font-sans transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-sky-400 flex items-center gap-1">
                      <span>🏭</span> Polypack Plant Layout
                    </h3>
                    <span className="text-[9px] text-slate-500 font-mono">Status: Main Overview</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${simulatedError
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-450 border border-emerald-500/30'
                    }`}>
                    {simulatedError ? 'ALERT CONDITIONS' : 'NOMINAL OPERATION'}
                  </span>
                </div>

                <div className="h-px bg-slate-800/80 my-1" />

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weaving Hall:</span>
                    <span className="text-slate-200 font-mono font-bold">9 Active Circular Looms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extrusion Lines:</span>
                    <span className="text-slate-200 font-mono font-bold">2 Lines Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Mesh Count:</span>
                    <span className="text-slate-200 font-mono font-bold">{stats.meshes ? stats.meshes : '...'}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/50 mt-1">
                  {simulatedError ? (
                    <span className="text-rose-400 font-medium">
                      ⚠️ WARNING: Anomalies detected on Extruder Line #1 and Circular Loom #4 / #5. Check highlighted zones.
                    </span>
                  ) : (
                    'All production lines operating within nominal temperature, speed, and tension parameters.'
                  )}
                </div>

                <span className="text-[8px] text-slate-500 text-center block mt-1 animate-pulse">
                  💡 Move cursor over 3D machines to inspect live component telemetry
                </span>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> Viewport Controls
            </h2>

            <div className="flex flex-col gap-3">
              {/* Simulate Machine Error Button */}
              <button
                onClick={() => setSimulatedError(!simulatedError)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${simulatedError
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
              >
                <span>🚨</span>
                <span>{simulatedError ? 'Clear Simulated Error' : 'Simulate Machine Error'}</span>
              </button>

              <div className="h-px bg-slate-800/80 my-1" />

              <div className="flex gap-2">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${autoRotate
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                >
                  {autoRotate ? '⏸ Pause Rotate' : '▶ Auto Rotate'}
                </button>
                <button
                  onClick={() => setIsWireframe(!isWireframe)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isWireframe
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                >
                  {isWireframe ? '🎨 Shaded Mode' : '🕸 Wireframe'}
                </button>
              </div>
            </div>
          </div>

          {/* Highlight Inspector Panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span> Mesh Highlighter
            </h2>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setHighlightedPart(highlightedPart === 'extruder' ? null : 'extruder')}
                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${highlightedPart === 'extruder'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${highlightedPart === 'extruder' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>Extruder Line</span>
              </button>

              <button
                onClick={() => setHighlightedPart(highlightedPart === 'looms' ? null : 'looms')}
                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${highlightedPart === 'looms'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${highlightedPart === 'looms' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>Circular Looms</span>
              </button>

              <button
                onClick={() => setHighlightedPart(highlightedPart === 'printer' ? null : 'printer')}
                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${highlightedPart === 'printer'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${highlightedPart === 'printer' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>Flexo Printer</span>
              </button>

              <button
                onClick={() => setHighlightedPart(highlightedPart === 'sewing' ? null : 'sewing')}
                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${highlightedPart === 'sewing'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${highlightedPart === 'sewing' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>Cutting & Sewing</span>
              </button>

              <button
                onClick={() => setHighlightedPart(highlightedPart === 'warehouse' ? null : 'warehouse')}
                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${highlightedPart === 'warehouse'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                  : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${highlightedPart === 'warehouse' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>Warehouse Storage</span>
              </button>
            </div>

            {highlightedPart && (
              <button
                onClick={() => setHighlightedPart(null)}
                className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all text-center cursor-pointer shadow-md"
              >
                Reset Highlights
              </button>
            )}
          </div>

          {/* Model Statistics Panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg mt-auto flex flex-col gap-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊</span> Statistics
            </h2>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850 flex flex-col">
                <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wide">Polygons</span>
                <span className="text-xs font-bold text-orange-400 font-mono mt-0.5">
                  {stats.triangles ? stats.triangles.toLocaleString() : "..."}
                </span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850 flex flex-col">
                <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wide">Vertices</span>
                <span className="text-xs font-bold text-indigo-400 font-mono mt-0.5">
                  {stats.vertices ? stats.vertices.toLocaleString() : "..."}
                </span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850 flex flex-col">
                <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wide">Meshes</span>
                <span className="text-xs font-bold text-teal-400 font-mono mt-0.5">
                  {stats.meshes ? stats.meshes.toLocaleString() : "..."}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 border-t border-slate-850 pt-2.5">
              <div className="flex justify-between">
                <span>Active Status</span>
                <span className={`font-semibold flex items-center gap-1 ${simulatedError ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${simulatedError ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                  {simulatedError ? 'Critical Alarm' : 'Nominal'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Render Speed</span>
                <span className={`font-mono font-bold ${fps >= 55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {fps} FPS
                </span>
              </div>
              <div className="flex justify-between">
                <span>Model Path</span>
                <span className="text-slate-200 font-mono">models/factory_floor.glb</span>
              </div>
              <div className="flex justify-between">
                <span>GLB File Size</span>
                <span className="text-slate-200 font-mono">4.0 MB</span>
              </div>
            </div>
          </div>
          </aside>

          {/* Toggle Collapse Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3.5 top-6 z-30 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-slate-400 flex items-center justify-center cursor-pointer shadow-xl transition-all active:scale-95"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* 3. Main Viewport Panel (Uses the entire width and height of the screen!) */}
        <section className="flex-grow h-full relative overflow-hidden bg-slate-950 flex flex-col">
          {/* Simulated Error Alert Overlay Banner */}
          {simulatedError && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-rose-600/90 text-white border border-rose-500 p-3.5 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.5)] backdrop-blur-md flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Critical Error Simulation Active</h4>
                  <p className="text-[10px] text-rose-150 mt-0.5">
                    Extruder #1 heater and specific Loom components (#4 fully, #5 partially) are blinking red. Hover over them to inspect telemetry warning logs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedError(false)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all shadow-md cursor-pointer"
              >
                Clear Alarm
              </button>
            </div>
          )}

          {/* Three.js Rendering Canvas */}
          <div className="flex-grow w-full h-full relative">
            <FactoryScene
              isWireframe={isWireframe}
              autoRotate={autoRotate}
              showGrid={showGrid}
              showShadows={showShadows}
              highlightedPart={highlightedPart}
              simulatedError={simulatedError}
              onHoverPart={(part, specific) => {
                setHoveredPart(part);
                setHoveredSpecificPart(specific);
              }}
              onLoaded={setStats}
            />
          </div>

          {/* Mini Legend overlayed on canvas bottom right */}
          <div className="absolute bottom-4 right-4 z-20 bg-slate-950/85 border border-slate-800/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs pointer-events-none select-none text-[10px] text-slate-400">
            <h4 className="text-slate-200 font-bold uppercase tracking-wide mb-1.5 text-[9px]">Scene Color Legend</h4>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/25 border border-emerald-500/50" />
                <span>Green Epoxy floor: Circular Weaving Loom room</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-[#8b5a2b]/40 border border-[#8b5a2b]/70" />
                <span>Brownish Epoxy floor: Flexo Printing & Cutting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-[#4c2c5c]/50 border border-[#4c2c5c]/80" />
                <span>Purplish floor: Extrusion Bay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-yellow-500 border border-white/20" />
                <span>Yellow mesh: Polypropylene spools & bags</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
