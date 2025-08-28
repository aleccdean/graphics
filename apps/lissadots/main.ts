import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;
let n = 100;
let a = 2;
let b = 1;
let ratio = 1;
let shift = 1;
let attributes = new VertexAttributes();

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;


  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);
  generateLissajous(n, a, b, ratio, shift);

  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  resizeCanvas(); 

  const nInput = document.getElementById('n-input') as HTMLInputElement;
  nInput.addEventListener('input', () => {
    n = parseInt(nInput.value);
    synchronize();
  });

  const aInput = document.getElementById('a-input') as HTMLInputElement;
  aInput.addEventListener('input', () => {
    a = parseFloat(aInput.value);
    synchronize();
  });

  const bInput = document.getElementById('b-input') as HTMLInputElement;
  bInput.addEventListener('input', () => {
    b = parseFloat(bInput.value);
    synchronize();
  });

  const ratioInput = document.getElementById('ratio-input') as HTMLInputElement;
  ratioInput.addEventListener('input', () => {
    ratio = parseFloat(ratioInput.value);
    synchronize();
  });

  const shiftInput = document.getElementById('shift-input') as HTMLInputElement;
  shiftInput.addEventListener('input', () => {
    shift = parseFloat(shiftInput.value);
    synchronize();
  });
}

function generateLissajous(n: number, a: number, b: number, ratio: number, shift: number) {
  // Initialize other graphics state as needed.
  let positions: Vector3[] = [];
 
   for (let i = 0; i < n; ++i) {
     const t = 3.14 * 2 * (i/n)
     positions.push(new Vector3(a * Math.sin(t),b * Math.sin(ratio*t + shift), 0));
   }
 
   let flatPositions =new Float32Array(positions.flatMap(p => p.xyz));
  

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', n, 3, flatPositions);

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
  generateLissajous(n, a, b, ratio, shift);
  render();
}

window.addEventListener('load', () => initialize());