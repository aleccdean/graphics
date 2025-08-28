import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;
let n = 6;
let radius = 0.5;
let attributes = new VertexAttributes();

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;


  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);
  generateCircle(n, radius);

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

function generateCircle(n: number, radius: number) {
  const theta = 3.14 * 2 / n
  // Initialize other graphics state as needed.
  let positions: Vector3[] = [];
 
   for (let i = 0; i < n; ++i) {
     positions.push(new Vector3(radius * Math.cos(theta*i),radius * Math.sin(theta*i), 0));
   }
 
   let flatPositions =new Float32Array(positions.flatMap(p => p.xyz));
  
  const colors = new Float32Array([
    1, 0, 0,         // vertex 0 is red
    0, 0, 1,         // vertex 1 is blue
  ]);

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', n, 3, flatPositions);
  //attributes.addAttribute('color', 2, 3, colors);

  vao = new VertexArray(shaderProgram, attributes)
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  shaderProgram.bind();
  vao.bind();
  vao.drawSequence(gl.LINE_LOOP);
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
  generateCircle(n, radius);
  render();
}

window.addEventListener('load', () => initialize());