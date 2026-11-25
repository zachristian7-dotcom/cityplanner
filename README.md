# CityPlanner Starter

A browser-based fictional city planner prototype built with React, TypeScript, Vite, and HTML Canvas.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Current features
- Fictional map with water, land, and a simple starting landscape
- Canvas-based map editor
- Paint roads, residential, commercial, industrial, parks, and water
- Erase tiles
- Pan using the Select tool and drag
- Zoom using the +/- controls; Ctrl/Command + mouse wheel also zooms
- Toggle grid
- Undo and redo
- Save/load in browser local storage
- Export/import-ready JSON project export (Open currently loads the browser's saved project)

## Next development milestones
1. Replace tile painting with connected road geometry and intersections.
2. Add map generation settings and terrain tools.
3. Add polygon zoning and district boundaries.
4. Add project file import and robust autosave.
5. Add simulation systems for demand, population, services, traffic, and budgets.

This is an early prototype, not a production city simulator.
