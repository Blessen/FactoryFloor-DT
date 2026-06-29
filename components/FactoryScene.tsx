"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, ContactShadows, Grid, Html } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface FactoryStats {
  triangles: number;
  vertices: number;
  meshes: number;
}

interface FactorySceneProps {
  isWireframe: boolean;
  autoRotate: boolean;
  showGrid: boolean;
  showShadows: boolean;
  highlightedPart: string | null;
  simulatedError: boolean;
  onHoverPart: (part: string | null, specific: string | null) => void;
  onLoaded: (stats: FactoryStats) => void;
}

const tooltipPositions: Record<string, [number, number, number]> = {
  extruder: [-13.0, 1.8, 6.0],
  looms: [2.5, 2.0, 7.5],
  printer: [-2.2, 1.6, -7.5],
  sewing: [5.4, 1.2, -7.5],
  warehouse: [15.5, 2.0, 4.0]
};

const FLOOR_COLORS: Record<string, string> = {
  WeavingFloor: '#166534',      // Vibrant Green Epoxy
  PrintingFloor: '#8b5a2b',     // Brownish Epoxy
  ExtrusionFloor: '#4c2c5c',    // Purplish floor
  OfficeFloor: '#27272a',       // Dark Zinc Grey
  ConcreteSlabBase: '#1e293b',  // Slate Grey Base
  BackgroundLawn: '#14532d'     // Deep Grass Green
};

const CACHE_BUST = "?v=20260627-2";
const GLB_URL = `/models/factory_floor.glb${CACHE_BUST}`;

function FactoryModel({
  isWireframe,
  highlightedPart,
  simulatedError,
  onHoverPart,
  onLoaded
}: {
  isWireframe: boolean;
  highlightedPart: string | null;
  simulatedError: boolean;
  onHoverPart: (part: string | null, specific: string | null) => void;
  onLoaded: (stats: FactoryStats) => void;
}) {
  // Load the GLB with a query parameter cache buster to force the browser to reload it
  const { scene } = useGLTF(GLB_URL);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<[number, number, number] | null>(null);
  const originalColorsRef = useRef<Map<string, THREE.Color>>(new Map());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clone the scene and materials once to avoid mutating the global cache
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    
    // Clone materials so we can color them individually without contaminating the cached version
    clone.traverse((child: any) => {
      if (child.isMesh) {
        if (child.material) {
          child.material = child.material.clone();
          
          // Override floor colors to make them match the legend and look premium
          if (child.name in FLOOR_COLORS) {
            child.material.color.set(FLOOR_COLORS[child.name]);
          }

          if (!originalColorsRef.current.has(child.name)) {
            originalColorsRef.current.set(child.name, child.material.color.clone());
          }
        }
      }
    });
    
    return clone;
  }, [scene]);

  // Clean up hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getPartCategory = (meshName: string): string | null => {
    if (
      meshName.includes('Extruder_Line') || 
      meshName.includes('ExtruStorage') || 
      meshName.includes('RawMixer') || 
      meshName.includes('RawGranule')
    ) {
      return 'extruder';
    }
    if (meshName.includes('Loom_ZoneC') || meshName.includes('LoomControl')) {
      return 'looms';
    }
    if (meshName.includes('FlexoPrinter')) {
      return 'printer';
    }
    if (meshName.includes('SewingLine')) {
      return 'sewing';
    }
    if (
      meshName.includes('StorageRack') || 
      meshName.includes('PalletRolls') || 
      meshName.includes('PalletBags') || 
      meshName.includes('WarehouseForklift')
    ) {
      return 'warehouse';
    }
    return null;
  };

  const getMachineId = (meshName: string): string => {
    if (meshName.includes('Extruder_Line') || meshName.includes('ExtruStorage') || meshName.includes('RawMixer') || meshName.includes('RawGranule')) {
      const match = meshName.match(/ZoneB_(\d+)/);
      return match ? `extruder_${match[1]}` : 'extruder_1';
    }
    if (meshName.includes('Loom_ZoneC') || meshName.includes('LoomControl')) {
      const match = meshName.match(/_(\d+)/);
      return match ? `loom_${match[1]}` : 'loom';
    }
    if (meshName.includes('FlexoPrinter')) {
      return 'printer';
    }
    if (meshName.includes('SewingLine')) {
      return 'sewing';
    }
    if (meshName.includes('StorageRack') || meshName.includes('PalletRolls') || meshName.includes('PalletBags') || meshName.includes('WarehouseForklift')) {
      return 'warehouse';
    }
    return meshName;
  };

  useEffect(() => {
    let triangles = 0;
    let vertices = 0;
    let meshes = 0;

    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        meshes++;

        if (child.geometry) {
          const geom = child.geometry;
          if (geom.index) {
            triangles += geom.index.count / 3;
          } else if (geom.attributes.position) {
            triangles += geom.attributes.position.count / 3;
          }
          if (geom.attributes.position) {
            vertices += geom.attributes.position.count;
          }
        }
      }
    });

    onLoaded({ triangles, vertices, meshes });
  }, [clonedScene, onLoaded]);

  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = isWireframe;
      }
    });
  }, [clonedScene, isWireframe]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const errorPulse = (Math.sin(elapsed * 8) + 1) / 2; // Rapid pulsing warning red
    
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material && child.material.color) {
        const origColor = originalColorsRef.current.get(child.name);
        if (origColor) {
          let targetColor = origColor;
          const category = getPartCategory(child.name);

          const isExtruder = category === 'extruder';
          const isLoom = category === 'looms';
          const isPrinter = category === 'printer';
          const isSewing = category === 'sewing';
          const isWarehouse = category === 'warehouse';

          const isAffectedExtruderPart = isExtruder && (
            child.name.includes('Extruder_Line_ZoneB_1_barrel') ||
            child.name.includes('Extruder_Line_ZoneB_1_heat_ring')
          );

          const isAffectedLoomPart = isLoom && (
            child.name.includes('Loom_ZoneC_4') ||
            child.name.includes('LoomControl_4') ||
            child.name.includes('Loom_ZoneC_5_shuttle_ring') ||
            child.name.includes('Loom_ZoneC_5_warp') ||
            child.name.includes('Loom_ZoneC_5_woven_fabric')
          );

          if (simulatedError && (isAffectedExtruderPart || isAffectedLoomPart)) {
            const warningRed = new THREE.Color('#ef4444');
            const dimRed = new THREE.Color('#450a0a');
            targetColor = new THREE.Color().lerpColors(dimRed, warningRed, 0.2 + errorPulse * 0.8);
          }
          else if (hovered && category === hovered) {
            targetColor = new THREE.Color('#f97316'); // Sleek glowing orange
          }
          else if (highlightedPart === 'extruder' && isExtruder) {
            targetColor = new THREE.Color('#f97316');
          } else if (highlightedPart === 'looms' && isLoom) {
            targetColor = new THREE.Color('#f97316');
          } else if (highlightedPart === 'printer' && isPrinter) {
            targetColor = new THREE.Color('#f97316');
          } else if (highlightedPart === 'sewing' && isSewing) {
            targetColor = new THREE.Color('#f97316');
          } else if (highlightedPart === 'warehouse' && isWarehouse) {
            targetColor = new THREE.Color('#f97316');
          }

          child.material.color.lerp(targetColor, delta * 6);
        }
      }
    });
  });

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const category = getPartCategory(e.object.name);
    const specificName = e.object.name;

    if (category) {
      const localPoint = e.point.clone();
      e.eventObject.worldToLocal(localPoint);
      setTooltipPos([localPoint.x, localPoint.y, localPoint.z]);
    }

    setHoveredMesh(specificName);

    if (category !== hovered) {
      setHovered(category);
    }
    onHoverPart(category, specificName);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(null);
      setHoveredMesh(null);
      setTooltipPos(null);
      onHoverPart(null, null);
    }, 50);
  };

  return (
    <group 
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <primitive key={clonedScene.uuid} object={clonedScene} />

      {hovered && tooltipPos && (
        <Html
          position={tooltipPos}
          className="pointer-events-none select-none z-30 transition-all duration-200"
        >
          <div 
            style={{
              transform: 'translate(-50%, -100%)'
            }}
            className="flex flex-col items-center animate-fade-in-up"
          >
            <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[210px] text-white flex flex-col gap-1.5 font-sans">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                {hovered === 'extruder' && (() => {
                  const num = hoveredMesh?.includes('ZoneB_2') ? '2' : '1';
                  return `🌀 Extruder Line #${num}`;
                })()}
                {hovered === 'looms' && (() => {
                  const num = hoveredMesh ? (hoveredMesh.match(/\d+/) || [''])[0] : '';
                  return `🕸️ Circular Loom #${num || 's'}`;
                })()}
                {hovered === 'printer' && '🖨️ Flexo Printer'}
                {hovered === 'sewing' && '✂️ Cutting & Sewing'}
                {hovered === 'warehouse' && '📦 Warehouse Storage'}
              </span>

              <div className="h-px bg-slate-800/80 my-0.5" />

              <div className="text-[11px] text-slate-400 leading-normal">
                {hovered === 'extruder' && (() => {
                  const isAffectedPart = hoveredMesh && (
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_barrel') ||
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_heat_ring')
                  );
                  if (simulatedError) {
                    if (isAffectedPart) return 'ALERT: Extruder #1 barrel heater report exceeded 280°C threshold. Screw feed stopped.';
                    return 'Tape Extrusion Line #2 and auxiliary equipment operating normally.';
                  }
                  const num = hoveredMesh?.includes('ZoneB_2') ? '2' : '1';
                  return `Melting PP granules and extruding them into high-strength weaving tape bobbins (Line #${num} active).`;
                })()}
                {hovered === 'looms' && (() => {
                  const isLoom4 = hoveredMesh?.includes('_4');
                  const isLoom5 = hoveredMesh?.includes('_5');
                  if (simulatedError) {
                    if (isLoom4) return 'ALERT: Loom #4 optical sensor triggered. Thread break occurred in the warp creel spool array. Standby mode.';
                    if (isLoom5) return 'ALERT: Loom #5 warp feed shuttle ring anomaly detected. Operating at degraded efficiency.';
                    return 'Weaving flat tapes into seamless tubular fabric spools. Operating normally.';
                  }
                  const num = hoveredMesh ? (hoveredMesh.match(/\d+/) || [''])[0] : '';
                  return `Weaving flat tapes into seamless tubular fabric spools (Loom #${num} active).`;
                })()}
                {hovered === 'printer' && 'Printing branding and warnings onto fabric spools at speeds of 150m/min.'}
                {hovered === 'sewing' && 'Cutting and bottom-sewing spools into finished yellow bag bales.'}
                {hovered === 'warehouse' && 'Storing raw material silos and finished bag inventory.'}
              </div>

              <div className="h-px bg-slate-800/80 my-0.5" />

              <div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold inline-block ${
                  simulatedError && hovered === 'extruder' && hoveredMesh && (
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_barrel') ||
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_heat_ring')
                  )
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    : simulatedError && hovered === 'looms' && hoveredMesh?.includes('_4')
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    : simulatedError && hovered === 'looms' && hoveredMesh?.includes('_5')
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-450 border border-emerald-550/35'
                }`}>
                  {simulatedError && hovered === 'extruder' && hoveredMesh && (
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_barrel') ||
                    hoveredMesh.includes('Extruder_Line_ZoneB_1_heat_ring')
                  ) ? 'CRITICAL ERROR' :
                   simulatedError && hovered === 'looms' && hoveredMesh?.includes('_4') ? 'CRITICAL ERROR' :
                   simulatedError && hovered === 'looms' && hoveredMesh?.includes('_5') ? 'WARNING' :
                   'OPERATIONAL'}
                </span>
              </div>
            </div>

            {/* Vertical connector line */}
            <div className="w-[1.5px] h-8 bg-gradient-to-b from-slate-700 to-orange-500/85" />
            {/* Glowing anchor dot pointing to the hovered location */}
            <div className="w-2 h-2 rounded-full bg-orange-500 border border-white shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(GLB_URL);

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-slate-900/95 border border-slate-700 p-5 rounded-xl backdrop-blur-md shadow-2xl">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-white text-sm font-semibold tracking-wide animate-pulse">Loading Factory Floor Model...</p>
        <span className="text-[10px] text-slate-500 mt-1">File Size: ~4.0 MB</span>
      </div>
    </Html>
  );
}

export function FactoryScene({
  isWireframe,
  autoRotate,
  showGrid,
  showShadows,
  highlightedPart,
  simulatedError,
  onHoverPart,
  onLoaded
}: FactorySceneProps) {
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 1.5, 0]);
  const controlsRef = useRef<any>(null);

  // Move target and camera relative to camera orientation (view space panning/dolly)
  const moveTarget = (dx: number, dy: number, dz: number) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;

    // Get camera local axes in world space
    const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

    // Calculate translation vector
    const translation = new THREE.Vector3()
      .addScaledVector(localX, dx)
      .addScaledVector(localY, dy)
      .addScaledVector(localZ, dz);

    // Translate both camera position and OrbitControls target
    camera.position.add(translation);
    controls.target.add(translation);
    controls.update();

    // Sync state so React is aware and doesn't overwrite it
    setCameraTarget([controls.target.x, controls.target.y, controls.target.z]);
  };

  // Reset camera position and target to initial values
  const resetCamera = () => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;

    camera.position.set(14, 11, 14);
    controls.target.set(0, 1.5, 0);
    controls.update();

    setCameraTarget([0, 1.5, 0]);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <Canvas
        shadows
        camera={{ position: [14, 11, 14], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#090d16']} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        <spotLight position={[0, 15, 0]} intensity={1.2} angle={Math.PI / 3} penumbra={1} castShadow />

        <Environment preset="city" />

        <Suspense fallback={<LoadingSpinner />}>
          <Center position={[0, 0, 0]}>
            <FactoryModel
              isWireframe={isWireframe}
              highlightedPart={highlightedPart}
              simulatedError={simulatedError}
              onHoverPart={onHoverPart}
              onLoaded={onLoaded}
            />
          </Center>

          {showGrid && (
            <Grid
              position={[0, -0.05, 0]}
              args={[25, 25]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#1e293b"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#f97316"
              fadeDistance={20}
              infiniteGrid
            />
          )}

          {showShadows && (
            <ContactShadows
              position={[0, -0.02, 0]}
              opacity={0.65}
              scale={25}
              blur={2.5}
              far={10}
            />
          )}

          <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minDistance={3}
            maxDistance={50}
            target={cameraTarget}
          />
        </Suspense>
      </Canvas>

      {/* On-screen Directional Navigation D-Pad */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-950/85 border border-slate-800/80 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2 font-sans select-none w-[155px]">
        <h4 className="text-slate-200 font-bold uppercase tracking-wide text-[9px] text-center mb-1">
          Scene Navigation
        </h4>
        
        {/* Horizontal & Vertical D-Pad */}
        <div className="grid grid-cols-3 gap-1.5 justify-items-center items-center">
          <div />
          <button
            onClick={() => moveTarget(0, 2, 0)}
            title="Move Up"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            ▲
          </button>
          <button
            onClick={() => moveTarget(0, 0, -2)}
            title="Zoom In (Forward)"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-all active:scale-95"
          >
            +
          </button>

          <button
            onClick={() => moveTarget(-2, 0, 0)}
            title="Move West (Left)"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            ◀
          </button>
          <button
            onClick={resetCamera}
            title="Reset to Center"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            🎯
          </button>
          <button
            onClick={() => moveTarget(2, 0, 0)}
            title="Move East (Right)"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            ▶
          </button>

          <div />
          <button
            onClick={() => moveTarget(0, -2, 0)}
            title="Move Down"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            ▼
          </button>
          <button
            onClick={() => moveTarget(0, 0, 2)}
            title="Zoom Out (Backward)"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 hover:text-orange-400 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-all active:scale-95"
          >
            -
          </button>
        </div>
        
        {/* Help Note */}
        <span className="text-[8px] text-slate-500 text-center leading-tight mt-1 px-1">
          Tip: You can also Right-Click + Drag inside the viewport to pan.
        </span>
      </div>
    </div>
  );
}
