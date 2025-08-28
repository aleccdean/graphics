import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);
  synchronizeSteps(8);

  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  const nSpinner = document.getElementById('n-spinner') as HTMLInputElement;
  nSpinner.addEventListener('input', () => {
    synchronizeSteps(parseInt(nSpinner.value));
    render();
  });

  resizeCanvas();  
}

function synchronizeSteps(n: number) {
   // Initialize other graphics state as needed.
   const width = 2 / n;
   const height = 2 / n;
 
   let positions: Vector3[] = [];
 
   for (let i = 0; i < n; ++i) {
     positions.push(new Vector3(-1 + i * width, -1 + i * height, 0));
     positions.push(new Vector3(-1 + (i + 1) * width, -1 + i * height, 0));
   }
 
   let flatPositions =new Float32Array(positions.flatMap(p => p.xyz));
 
   const attributes = new VertexAttributes();
   attributes.addAttribute('position', 2 * n, 3, flatPositions);

   vao = new VertexArray(shaderProgram, attributes)
}
function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  shaderProgram.bind();
  vao.bind();
  vao.drawSequence(gl.LINE_STRIP);
  vao.unbind();
  shaderProgram.unbind();
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

window.addEventListener('load', () => initialize());