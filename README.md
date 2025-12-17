# CS 488 - Computer Graphics Repository

A comprehensive collection of WebGL-based graphics applications and demonstrations developed for the CS 488 Computer Graphics course at James Madison University. This repository contains multiple renderer implementations, educational examples, and practical projects showcasing various graphics programming concepts.

## Overview

This repository is organized as a monorepo with multiple independent WebGL applications built with TypeScript, Vite, and WebGL. Each application demonstrates different graphics techniques, from basic rendering to advanced effects like terrain generation, lighting, and skeletal animation.

## Project Structure

```
cs488-deanac/
├── apps/                          # Collection of WebGL applications
├── lib/                           # Shared graphics library modules
├── public/                        # Static assets
├── build/                         # Compiled output
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.js                 # Vite build configuration
├── index.html                     # Main landing page
└── README.md                      # This file
```

## Library Modules (`lib/`)

The `lib/` directory contains reusable TypeScript utilities for graphics programming:

### Core Graphics
- **`shader-program.ts`** - WebGL shader compilation and program management
- **`vertex-array.ts`** - Vertex Array Object (VAO) management
- **`vertex-attributes.ts`** - Vertex attribute configuration and binding
- **`trimesh.ts`** - Triangle mesh data structures
- **`trimesh-io.ts`** - Import/export utilities for triangle meshes

### Mathematics
- **`vector.ts`** - Vector operations and utilities
- **`matrix.ts`** - Matrix operations and transformations
- **`quaternion.ts`** - Quaternion-based rotations
- **`math-utilities.ts`** - General mathematical helper functions

### Camera & View Control
- **`camera.ts`** - Base camera implementation
- **`first-person-camera.ts`** - First-person camera control
- **`trackball.ts`** - Trackball camera for 3D object manipulation
- **`terrainCamera.ts`** - Camera specialized for terrain navigation

### Geometry & Modeling
- **`model.ts`** - 3D model representation and management
- **`gltf.ts`** - glTF format loader/parser
- **`static-gltf.ts`** - Static glTF asset handling
- **`prefab.ts`** - Reusable prefab geometry generation
- **`intersect.ts`** - Ray casting and collision detection

### Procedural Generation
- **`noise.ts`** - Perlin noise and procedural generation
- **`field.ts`** - Field-based computations

### Utilities
- **`web-utilities.ts`** - Web/DOM helper functions
- **`sandbox.ts`** - Sandboxed execution environment
- **`globals.d.ts`** - TypeScript global type definitions

## Applications (`apps/`)

### Major Projects

#### `rastercaster/`
A software rasterizer implementation demonstrating the graphics pipeline. Converts 3D geometry to 2D raster images through vertex processing, primitive assembly, rasterization, and fragment shading.

#### `boxels/`
Voxel-based rendering system with 3D grid-based geometry. Includes model loading and voxel-specific rendering techniques.
- **`models/`** - Voxel model assets

#### `game/`
A complete 3D game engine demonstrating advanced graphics techniques including:
- Terrain rendering
- Skybox rendering with cubemaps
- Model-based rendering
- Billboard effects for sprites
- Multiple shader types (flat, skybox, billboard)
- **`cubemap/`** - Cubemap texture assets
- **`models/`** - 3D model assets
- **`textures/`** - Texture resources

#### `skeletoon/`
Skeletal animation and character rendering system with non-photorealistic (toon-style) shading.

### Class Readings & Tutorials

#### Basic Rendering
- **`hello-cornflower/`** - Hello World equivalent for graphics (rendering a cornflower blue triangle)
- **`dots/`** - Point rendering and particle effects
- **`steps/`** - Progressive rendering demonstrations
- **`isoceles/`** - Geometric shape rendering
- **`rings/`** - Circular geometry rendering
- **`circle/`** - Circle rendering techniques

#### Advanced Topics
- **`Chapter5-Graphics-pipeline/`** - In-depth graphics pipeline explanation with examples
- **`Lighting-reading/`** - Phong/Blinn-Phong lighting models and shading techniques
- **`Camera-Terrain-Reading/`** - Terrain rendering and camera control
- **`interaction-reading/`** - User input handling and mouse/keyboard interaction
- **`texture-reading/`** - Texture mapping and coordinate systems
- **`atoms/`** - Atomic/particle-based rendering demonstrations

#### Effects & Techniques
- **`bumplit/`** - Bump mapping for surface detail
- **`lissadots/`** - Mathematical curve visualization (Lissajous figures)
- **`noisy-globe/`** - Procedurally generated globe with Perlin noise
- **`pipes/`** - Procedural pipe/tube generation
- **`torus/`** - Torus mesh generation and rendering
- **`life/`** - Conway's Game of Life visualization

### Transformations & Matrices
- **`transfit/`** - Transformation and fitting demonstrations
- **`transfit-matrix/`** - Matrix-based transformation examples

### Additional Applications
- **`Saguaro/`** - Specialized rendering project
- **`stick-shift/`** - Interactive transformation demonstrations
- **`stroll/`** - Animation and motion demonstrations

## File Structure for Each Application

Most applications follow a standard structure:

```
apps/[app-name]/
├── main.ts                   # Application entry point
├── flat-vertex.glsl          # Standard vertex shader
├── flat-fragment.glsl        # Standard fragment shader
├── [optional-shaders].glsl   # Specialized shaders
├── index.html                # App-specific HTML
└── [subdirectories]/         # Assets (models, textures, etc.)
```

## Technology Stack

- **Language**: TypeScript
- **Build Tool**: Vite (fast ES module bundler)
- **Graphics API**: WebGL 2.0
- **Type Checking**: TypeScript with Vite type checking plugin
- **Version Control**: Git

## Getting Started

### Prerequisites
- Node.js 16+ with npm

### Installation

```bash
# Clone the repository
git clone https://github.com/aleccdean/graphics.git
cd cs488-deanac

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot module replacement
# Opens browser automatically
npm run dev
```

The main page at `http://localhost:5173/` displays links to all available applications.

### Building

```bash
# Compile TypeScript and build optimized bundles
npm run build
```

Output is placed in the `build/` directory.

### Running Sandbox

```bash
# Run TypeScript utilities in Node.js environment
npm run sandbox
```

## Key Graphics Concepts Covered

- **Shaders & GLSL** - Vertex and fragment shader programming
- **Graphics Pipeline** - Vertex processing, primitive assembly, rasterization, fragment processing
- **Transformations** - Translation, rotation, scaling using matrices and quaternions
- **Lighting & Shading** - Phong, Blinn-Phong models, per-vertex and per-pixel shading
- **Texturing** - UV mapping, texture filtering, cubemaps
- **Camera Systems** - Perspective, orthographic, first-person, trackball
- **Procedural Generation** - Noise, terrain, geometry synthesis
- **Advanced Techniques** - Bump mapping, skeletal animation, skyboxes, billboarding
- **Collision Detection** - Ray casting and intersection testing
- **Model Loading** - glTF format parsing and rendering

## Build Output

The compiled application is organized as:

```
build/
├── apps/    # Compiled application code
└── lib/     # Compiled library modules
```

## Styling

Visual styling is provided by `public/style.css`.

## Notes

- This repository is a course project for JMU CS 488
- Each application is independently runnable via Vite's development server
- The main page (`index.html`) provides navigation to all examples
- Applications are organized into "Projects" (major implementations) and "Class/Reading" (educational examples)


