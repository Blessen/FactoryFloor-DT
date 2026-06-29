# Factory Floor DT

Factory Floor DT is a modern, high-performance **3D Factory Floor Layout Digital Twin** application built on Next.js, React Three Fiber (R3F), and Tailwind CSS. It visualizes an industrial factory floor layout, provides real-time telemetry simulations, highlights machine parts, and implements responsive camera controls.

---

## 🚀 Key Features

*   **Interactive 3D Viewport**: Seamless 3D navigation and rendering powered by React Three Fiber and Three.js.
*   **Intuitive Camera Controls**:
    *   Responsive D-pad controls for panning camera Up/Down/Left/Right.
    *   Dedicated Zoom In/Out (+/-) and Reset Camera buttons.
    *   Integrated orbit controls for interactive rotation and inspection.
*   **Collapsible Industrial Sidebar**:
    *   Slides dynamically to maximize screen area for the 3D scene.
    *   Lists factory machinery (Extruder, Looms, Printers, Sewing, Warehouse).
    *   Provides quick toggles for wireframe mode, auto-rotation, shadows, and grid helper.
*   **Digital Twin Telemetry & Alarm System**:
    *   Pulsing warnings on machinery and floor zones (blinking red) during errors.
    *   Hover-triggered tooltip indicators containing telemetry status logs.
    *   Simulation toggle to trigger and clear alarms.
*   **Vibrant Visual Floor Layout**:
    *   **Green Epoxy**: Circular Weaving Loom room
    *   **Brownish Epoxy**: Flexo Printing & Cutting
    *   **Purplish**: Extrusion Bay
    *   **Dark Zinc Grey**: Office areas
*   **Performance Metrics & HUD**:
    *   Real-time FPS tracking.
    *   Polygon, vertices, and mesh counters directly from the loaded `.glb` model.

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
*   **3D Render Pipeline**:
    *   [Three.js](https://threejs.org/)
    *   [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) (R3F wrapper)
    *   [@react-three/drei](https://github.com/pmndrs/drei) (3D helper elements & loaders)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Programming Language**: TypeScript

---

## 📦 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18.x or later recommended).

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   cd factory-floor-dt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to inspect the 3D dashboard.

### Build and Deploy

To create an optimized production build:
```bash
npm run build
```

To run the production build locally:
```bash
npm run start
```
