import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Prefab } from 'lib/prefab.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromWorld: Float32Array;
let clipFromEye: Matrix4;
let vao: VertexArray;
let worldFromModel: Matrix4;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const mesh = Prefab.cylinder(0.3, 0.1, 32, 16);
  mesh.computeNormals();
  mesh.computeMinMax();

  const centroid = mesh.min.add(mesh.max).scalarMultiply(0.5);
  const rotator = Matrix4.rotateX(90);

  worldFromModel =  rotator.multiplyMatrix(Matrix4.translate(-centroid.x, -centroid.y, -centroid.z));
  


  const attributes = new VertexAttributes();
  attributes.addAttribute('position', mesh.vertexCount, 3, mesh.positionBuffer());
  attributes.addAttribute('normal', mesh.vertexCount, 3, mesh.normalBuffer());
  attributes.addIndices(mesh.faceBuffer());

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  vao = new VertexArray(shaderProgram, attributes)
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());


  resizeCanvas();  
}

function render() {
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  shaderProgram.bind();
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  shaderProgram.unbind();

}



function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  const height = 3 / aspectRatio;
  //clipFromEye = Matrix4.ortho(-3, 3, -height, height, -10, 10);
  clipFromEye = Matrix4.perspective(45, aspectRatio, 0.01, 10);
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