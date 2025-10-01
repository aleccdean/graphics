import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import * as gltf from 'lib/gltf.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;

let clipFromEye: Matrix4;
let eyeFromWorld: Matrix4;
let worldFromPose: Matrix4;

let model: gltf.Model
let vao: VertexArray;



async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  model = await gltf.Model.readFromUrl('model/Character.gltf');
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', model.meshes[0].positions.count, 3, model.meshes[0].positions.buffer);
  attributes.addAttribute('normal', model.meshes[0].normals!.count, 3, model.meshes[0].normals!.buffer);
  attributes.addAttribute('weights', model.meshes[0].weights!.count, 4, model.meshes[0].weights!.buffer);
  attributes.addAttribute('joints', model.meshes[0].joints!.count, 4, new Float32Array(model.meshes[0].joints!.buffer));
  attributes.addIndices(new Uint32Array(model.meshes[0].indices!.buffer));

  vao = new VertexArray(shaderProgram, attributes);

  for (let clip of Object.keys(model.animations)) {
    console.log(clip);
  }
  model.play('ArmatureAction');

  // Set up event listeners BEFORE calling resizeCanvas
  window.addEventListener('resize', () => resizeCanvas());
  
  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  shaderProgram.bind();
  
  // Create a proper copy, not a reference

  worldFromPose = Matrix4.identity();
  worldFromPose = worldFromPose.multiplyMatrix(Matrix4.scale(0.5, 0.5, 1));
  worldFromPose= worldFromPose.multiplyMatrix(Matrix4.translate(0, -10, 0));
  worldFromPose = worldFromPose.multiplyMatrix(Matrix4.rotateY(90));
  eyeFromWorld = Matrix4.translate(0, 0, -10);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements);
  shaderProgram.setUniformMatrix4fv('worldFromPose', worldFromPose.elements);

  for (let [i, matrix] of model.skinTransforms(300).entries()) {
    shaderProgram.setUniformMatrix4fv(`jointTransforms[${i}]`, matrix.elements);
  }
  
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  

  shaderProgram.unbind();
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  model.tick(elapsed);
  render();
  requestAnimationFrame(animate);
  then = now;
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  const size = 7;
  const center = [0, 0];
  if (aspectRatio >= 1) {
    clipFromEye = Matrix4.ortho(center[0] - size * aspectRatio, center[0] + size * aspectRatio, center[1] - size, center[1] + size, -10, 10);
  } else {
    clipFromEye = Matrix4.ortho(center[0] - size, center[0] + size, center[1] - size / aspectRatio, center[1] + size / aspectRatio, -10, 10);
  }
  render();
  requestAnimationFrame(animate);
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