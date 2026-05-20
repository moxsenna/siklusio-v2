# Application Architecture

This document outlines the architectural structure of the application.

## Overview
The application follows a full-stack architecture, separating the client-side presentation (Frontend) and the server-side logic (Backend) into distinct directories. This clear separation of concerns makes the codebase easier to scale, maintain, and understand.

## Directory Structure

- **/frontend**
  Contains the React Single Page Application (SPA).
  - Built with Vite for rapid development and optimized builds.
  - Uses Tailwind CSS for utility-first styling.
  - **src/**: Contains React source code (components, hooks, pages, contexts, etc.).
  - **index.html**: The main HTML entry template for the client.

- **/backend**
  Contains the Node.js server.
  - Built with Express.js to handle API requests and server-side logic (if any).
  - **index.ts**: Main server entry point. In development mode it mounts Vite middleware, and in production it serves the compiled frontend assets alongside the API routes.

- **Root Configuration Files**
  - `package.json`: Manages shared dependencies and unified build scripts for both frontend and backend.
  - `vite.config.ts`: Vite configuration customized to use `/frontend` as its root directory.
  - `tsconfig.json`: TypeScript configuration, with path aliases properly mapped to the frontend source.

## Build and Execution Flow

1. **Development (`npm run dev`)**:
   - `tsx` runs the backend server (`backend/index.ts`).
   - The backend server dynamically mounts Vite as middleware. This allows for a unified local development port and provides seamless Hot Module Replacement (HMR) for the React application.

2. **Production Build (`npm run build`)**:
   - First, `vite build` compiles the React frontend into static, minified HTML/CSS/JS assets inside the `/dist` directory.
   - Next, `esbuild` bundles the backend server (`backend/index.ts`) into a standalone `dist/server.cjs` file format, avoiding ES module runtime complexities.

3. **Production Run (`npm run start`)**:
   - Executes the pre-compiled server: `node dist/server.cjs`.
   - The Express server provides its API routes and automatically falls back to serving the static frontend files from `/dist` for any unmatched route.
