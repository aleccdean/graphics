import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;
let n = 40;
let radius = 0.5;
let attributes = new VertexAttributes();

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;


  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);
  generateCircle(n);


  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  resizeCanvas(); 

  const nInput = document.getElementById('n-input') as HTMLInputElement;
  nInput.addEventListener('input', () => {
    n = parseInt(nInput.value);
    synchronize();
  });

  const radiusInput = document.getElementById('radius-input') as HTMLInputElement;
  radiusInput.addEventListener('input', () => {
    radius = parseFloat(radiusInput.value);
    synchronize();
  });
}

function generateCircle(n: number) {
  const theta = 3.14 * 2 / n
  // Initialize other graphics state as needed.
  let positions: Vector3[] = [];
 
  for (let i = 0; i < n; ++i) {
     let radians = i / n * Math.PI * 2;
     let x = Math.cos(radians); 
     let y = Math.sin(radians); 
     positions.push(new Vector3(x, y, 0));

     x = 0.7 * Math.cos(radians);
     y = 0.7 * Math.sin(radians);
     positions.push(new Vector3(x, y, 0));
   }

   const faces = [];

   for ( let i = 0; i < n; ++i) {
    const base = 2 * i;
    const nextBase = (base + 2) % (2*n);
    faces.push(base, nextBase, base + 1);
    faces.push(base + 1, nextBase, nextBase + 1);
   }


   let flatPositions =new Float32Array(positions.flatMap(p => p.xyz));
  
  const colors = new Float32Array([
    1, 0, 0,         // vertex 0 is red
    0, 0, 1,         // vertex 1 is blue
  ]);

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', 2*n, 3, flatPositions);
  attributes.addIndices(new Uint32Array(faces))
  //attributes.addAttribute('color', 2, 3, colors);

  vao = new VertexArray(shaderProgram, attributes)
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  shaderProgram.bind();
  vao.bind();
  shaderProgram.setUniform1f('scale', 0.3);
  shaderProgram.setUniform3f('offsets', -0.3, 0.2, 0);
  vao.drawIndexed(gl.TRIANGLES);

  shaderProgram.setUniform1f('scale', 0.6);
  shaderProgram.setUniform3f('offsets', 0.5, -0.5, 0);
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  shaderProgram.unbind();
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

function synchronize() {
  // Release any previous VAO and VBOs.
  vao?.destroy();
  attributes?.destroy();

  // TODO: regenerate circle and redraw.
  generateCircle(n);
  render();
}

window.addEventListener('load', () => initialize());