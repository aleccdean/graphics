import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Prefab } from 'lib/prefab.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromWorld: Float32Array;
let vao: VertexArray;
let radians: number = 0;


async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const torus = Prefab.torus(0.3, 0.1, 32, 16);
  torus.computeNormals();
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', torus.vertexCount, 3, torus.positionBuffer());
  attributes.addAttribute('normal', torus.vertexCount, 3, torus.normalBuffer());
  attributes.addIndices(torus.faceBuffer());

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  vao = new VertexArray(shaderProgram, attributes)
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      radians = -1.0;
      render();
    }
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
      radians += 1.0;
      render();
    }
  });

  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  shaderProgram.bind();
  shaderProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld);
  shaderProgram.setUniform1f('radians', radians);
  shaderProgram.setUniform3f('offset', 0.0, 0.0, 0.0);
  shaderProgram.setUniform3f('factors', 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f('rgb', 1.0, 0.843, 0.0);
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  shaderProgram.unbind();

}



function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  const size = 1;
  const center = [0, 0];
  if (aspectRatio >= 1) {
    clipFromWorld = ortho(center[0] - size * aspectRatio, center[0] + size * aspectRatio, center[1] - size, center[1] + size, -1, 1);
  } else {
    clipFromWorld = ortho(center[0] - size, center[0] + size, center[1] - size / aspectRatio, center[1] + size / aspectRatio, -1, 1);
  }
  render();
}

function ortho(left: number, right: number, bottom: number, top: number, near: number = -1, far: number = 1) {
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,
    -(right + left) / (right - left),
    -(top + bottom) / (top - bottom),
    (near + far) / (near - far),
    1,
  ]);
}

window.addEventListener('load', () => initialize());