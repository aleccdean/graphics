import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let vao: VertexArray;
let mouseX: GLfloat;
let mouseY: GLfloat;
let code: string;
let time: number;

// Function to create a shader program with injected user code
function createShaderWithCode(vertexSource: string, fragmentSource: string, userCode: string): ShaderProgram {
  const modifiedFragmentSource = fragmentSource.replace(
    '// TODO: define a vec3 named color.',
    userCode
  );
  return new ShaderProgram(vertexSource, modifiedFragmentSource);
}

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

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', 4, 3, positions);

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  
  //default code
  const codeInput = document.getElementById('code') as HTMLTextAreaElement;
  code = codeInput.value;
  
  shaderProgram = createShaderWithCode(vertexSource, fragmentSource, code);

  vao = new VertexArray(shaderProgram, attributes)

  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  // Set up event listener for code changes
  codeInput.addEventListener('input', () => {
    shaderProgram = createShaderWithCode(vertexSource, fragmentSource, codeInput.value);
    vao = new VertexArray(shaderProgram, attributes);
  });

  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX - canvas.getBoundingClientRect().left;
    mouseY = event.clientY - canvas.getBoundingClientRect().top;
  });

  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  time = window.performance.now() / 1000;
  shaderProgram.bind();
  vao.bind();
  shaderProgram.setUniform2f('dimensions', canvas.width, canvas.height);
  shaderProgram.setUniform2f('mouse', mouseX, mouseY);
  shaderProgram.setUniform1f('time', time);
  vao.drawSequence(gl.TRIANGLE_STRIP);
  vao.unbind();
  shaderProgram.unbind();

  requestAnimationFrame(render);
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

window.addEventListener('load', () => initialize());