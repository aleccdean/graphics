import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;
let mouseX: GLfloat;
let mouseY: GLfloat;
let code;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  // Initialize other graphics state as needed.
  const positions = new Float32Array([
    -1, -1, 0,     // vertex 0 is bottom left
    -1, 1, 0,     // vertex 1 is top left
    1, -1, 0,     // vertex 2 is bottom right
    1, 1, 0,      // vertex 3 is top right
  ]);
  
  const colors = new Float32Array([
    1, 0, 0,         // vertex 0 is red
    0, 0, 1,         // vertex 1 is blue
    0, 1, 0,
    1, 1, 1,
  ]);

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', 4, 3, positions);
  attributes.addAttribute('color', 4, 3, colors);

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  vao = new VertexArray(shaderProgram, attributes)
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  const codeInput = document.getElementById('code') as HTMLInputElement;
  codeInput.addEventListener('input', () => {
    code = parseInt(codeInput.value);
  });

  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX - canvas.getBoundingClientRect().left;
    mouseY = event.clientY - canvas.getBoundingClientRect().top;
    render();
  });

  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  shaderProgram.bind();
  vao.bind();
  shaderProgram.setUniform2f('dimensions', canvas.width, canvas.height);
  shaderProgram.setUniform2f('mouse', mouseX, mouseY);
  shaderProgram.setUniform1f('time', window.performance.timeOrigin / 1000);
  vao.drawSequence(gl.TRIANGLE_STRIP);
  vao.unbind();
  shaderProgram.unbind();



  //requestAnimationFrame(render);
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

window.addEventListener('load', () => initialize());