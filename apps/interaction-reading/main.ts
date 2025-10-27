import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchImage, fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3, Vector4 } from 'lib/vector.js';
import { FirstPersonCamera } from 'lib/terrainCamera.js';
import { Field2 } from 'lib/field.js';
import { Prefab } from 'lib/prefab.js';
import { intersectRayBox, intersectRaySphere } from 'lib/intersect.js';
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

  
  const mat = Matrix4.identity();
  mat.set(0,0, 1);
  mat.set(0,1, 0);
  mat.set(0,2, 0);
  mat.set(0,3, 3);
  mat.set(1,0, 0);
  mat.set(1,1, -1.658);
  mat.set(1,2, -1.901);
  mat.set(1,3, -5);
  mat.set(2,0, 0);
  mat.set(2,1, -1.118);
  mat.set(2,2, 2.819);
  mat.set(2,3, 10);
  mat.set(3,0, 0);
  mat.set(3,1, 0);
  mat.set(3,2, 0);
  mat.set(3,3, 1);
  console.log(mat.inverse());


  const rayStart = new Vector3(0.1,0.2,1.3);
  const rayDirection = new Vector3(0.6,0,0.8);
  const sphereCenter = new Vector3(0,0,0);
  const sphereRadius = 1;
  const boxMin = new Vector3(-1,-2,-1);
  const boxMax = new Vector3(1, 1,2);

  console.log(intersectRaySphere(rayStart, rayDirection, sphereCenter, sphereRadius));
  console.log(intersectRayBox(rayStart, rayDirection, boxMin, boxMax));

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

  //window.addEventListener('keydown', onKeyDown);
  //window.addEventListener('keyup', onKeyUp);
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      targetHorizontal = 1;
    } else if (event.key === 'ArrowRight') {
      targetHorizontal = -1;
    }
  });

  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      targetHorizontal = 0;
    } else if (event.key === 'ArrowRight') {
      targetHorizontal = 0;
    }
  });
  window.addEventListener('pointerdown', () => {
    document.body.requestPointerLock();
  });
  window.addEventListener('pointerdown', event => {
  const mousePixel = new Vector3(
    event.clientX,
    canvas.height - 1 - event.clientY,
    0,
  );
});
  
  window.addEventListener('pointermove', event => {
  if (document.pointerLockElement) {
    camera.yaw(-event.movementX * 0.5);
    camera.pitch(-event.movementY * 0.5);
    // console.log(camera.eyeFromWorld);
    render();
  }
});

  window.addEventListener('pointerdown', onPointerDown);

  window.addEventListener('pointerup', onPointerUp);

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

let targetHorizontal = 0;
let currentHorizontal = 0;
//const weight = Math.exp(Math.log(epsilon) / duration);

function animate(now: DOMHighResTimeStamp) {
  const elapsedMillis = then ? now - then : 0;
  const elapsedSeconds = elapsedMillis / 1000;
 // const partialWeight = Math.pow(weight, elapsedSeconds); 
  
 // currentHorizontal = partialWeight * currentHorizontal + (1 - partialWeight) * targetHorizontal;
  let radians = targetHorizontal;
  worldFromModel = Matrix4.rotateY(radians).multiplyMatrix(worldFromModel);
  render();
  requestAnimationFrame(animate);
  then = now;
}

/*
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
*/


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

function onPointerDown(event: PointerEvent){
  window.removeEventListener('pointermove', onPointerMove);
  const mousePixel = new Vector4(
    event.clientX,
    canvas.height - 1 - event.clientY,
    0,
    1
  );
}

function onMouseUp(event: MouseEvent) {
  const mousePixel = new Vector4(
    event.clientX,
    canvas.height - 1 - event.clientY,
    0,
    1
  );

  const mouseNormalized = new Vector4(
    mousePixel.x / canvas.width * 2 - 1,
    mousePixel.y / canvas.height * 2 - 1,
    -1,
    1
  );
  /*
  let mouseEye = eyeFromClip.multiplyVector4(mouseNormalized);
  mouseEye = mouseEye.divideScalar(mouseEye.w);
  const mouseWorld = worldFromEye.multiplyVector4(mouseEye);

  let rayStart = mouseWorld;

  mouseNormalized.z = 1;
  mouseEye = eyeFromClip.multiplyVector4(mouseNormalized);
  mouseEye = mouseEye.divideScalar(mouseEye.w);
  mouseWorld = worldFromEye.multiplyVector4(mouseEye);
  let rayEnd = mouseWorld;
  */
}

function onPointerUp(event: PointerEvent){
  window.removeEventListener('pointermove', onPointerMove);
}

function onPointerMove(event: PointerEvent){

}
// TODO: add event listeners

window.addEventListener('load', () => initialize());
