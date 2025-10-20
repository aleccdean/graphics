import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchImage, fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3 } from 'lib/vector.js';
import { FirstPersonCamera } from 'lib/terrainCamera.js';
import { Field2 } from 'lib/field.js';
import { Prefab } from 'lib/prefab.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromEye: Matrix4;
let vao: VertexArray;
let worldFromModel: Matrix4;
let camera: FirstPersonCamera;
let heightmap: Field2;
let hMap: Trimesh;
let lightPosition: Vector3;
// These will be -1, 0, or 1.
let horizontal = 0;
let vertical = 0;
let turn = 0;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const image = await fetchImage('heightmap.png');
  const scale = new Vector3(1, 100, 1);
  heightmap = Field2.readFromImage(image);
  hMap = heightmap.toTrimesh(scale);

  

  const from = new Vector3(0,2, 0);
  const to = new Vector3(5, 0, 5);
  const up = new Vector3(0, 1, 0);
  camera = new FirstPersonCamera(from, to, heightmap, 1, scale);
  // console.log(camera.right);

  
  
  
  worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,0));
  const attributes = new VertexAttributes();
  hMap.computeNormals();
  attributes.addAttribute('position', hMap.vertexCount, 3, hMap.positionBuffer());
  attributes.addAttribute('normal', hMap.vertexCount, 3, hMap.normalBuffer());
  attributes.addIndices(hMap.faceBuffer());

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  lightPosition = new Vector3(0.0, 0.0, 0.0);
  vao = new VertexArray(shaderProgram, attributes)
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', () => {
    document.body.requestPointerLock();
  });
  
  window.addEventListener('pointermove', event => {
  if (document.pointerLockElement) {
    camera.yaw(-event.movementX * 0.5);
    camera.pitch(-event.movementY * 0.5);
    // console.log(camera.eyeFromWorld);
    render();
  }
});

  resizeCanvas();  
  requestAnimationFrame(animate);
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  const lightPositionEye = camera.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("ambientFactor", 0.1);
  shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', camera.eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  //vao.drawSequence(gl.POINTS);
  vao.unbind();
  shaderProgram.unbind();

}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  clipFromEye = Matrix4.perspective(90, aspectRatio, 0.01, 2000);
  render();
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  // update animated state
  const deltaSeconds = elapsed / 1000;               // convert ms -> s
  const moveSpeed = 10;                             // units per second
  const turnSpeedDeg = 90;                           // degrees per second
  camera.advance(vertical * deltaSeconds * moveSpeed);
  camera.strafe(horizontal * deltaSeconds * moveSpeed);
  if (turn !== 0) {
    camera.yaw(turn * deltaSeconds * turnSpeedDeg);
  }
  resizeCanvas();
  requestAnimationFrame(animate);
  then = now;
}



function onKeyDown(event: KeyboardEvent) {
  const key = event.key;
  if (key === 'w' || key === 'ArrowUp') {
    vertical = 1;
  } else if (key === 's' || key === 'ArrowDown') {
    vertical = -1;
  } else if (key === 'a' || key === 'ArrowLeft') {
    horizontal = -1;
  } else if (key === 'd' || key === 'ArrowRight') {
    horizontal = 1;
  } else if (key === 'q') {
    turn = 1;
  } else if (key === 'e') {
    turn = -1;
  }
  render();
}

function onKeyUp(event: KeyboardEvent) {
  const key = event.key;
  if (key === 'w' || key === 's' || key === 'ArrowUp' || key == 'ArrowDown') {
    vertical = 0;
  } else if (key === 'a' || key === 'd' || key === 'ArrowLeft' || key == 'ArrowRight') {
    horizontal = 0;
  } else if (key === 'q' || key === 'e') {
    turn = 0;
  }
}
// TODO: add event listeners

window.addEventListener('load', () => initialize());
