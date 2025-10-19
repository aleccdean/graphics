import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchImage, fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3 } from 'lib/vector.js';
import { FirstPersonCamera } from 'lib/first-person-camera.js';
import { Field2 } from 'lib/field.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromEye: Matrix4;
let vao: VertexArray;
let worldFromModel: Matrix4;
let eyeFromWorld: Matrix4;
let camera: FirstPersonCamera;
let hMap: Trimesh;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const image = await fetchImage('heightmap.png');
  
  const heightmap = Field2.readFromImage(image);
  hMap = heightmap.toTrimesh(new Vector3(1, 1, 1));
  

  const from = new Vector3(1, 1, 1);
  const to = new Vector3(1, 1, 1);
  const up = new Vector3(1, 1, 1);
  camera = new FirstPersonCamera(from, to, up);
  console.log(camera.right);
  
  
  eyeFromWorld = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,-10));
  worldFromModel = Matrix4.identity();
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', hMap.vertexCount, 3, hMap.positionBuffer());
  attributes.addAttribute('normal', hMap.vertexCount, 3, hMap.normalBuffer());
  attributes.addIndices(hMap.faceBuffer());

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

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
    camera.yaw(-event.movementX * 10);
    camera.pitch(-event.movementY * 10);
    render();
  }
    
});

  resizeCanvas();  
  requestAnimationFrame(animate);
}

function render() {
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  shaderProgram.bind();
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.drawSequence(gl.POINTS);
  vao.unbind();
  shaderProgram.unbind();

}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  clipFromEye = Matrix4.perspective(45, aspectRatio, 0.01, 10);
  render();
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  // update animated state
  render();
  requestAnimationFrame(animate);
  then = now;
}


// These will be -1, 0, or 1.
let horizontal = 0;
let vertical = 0;
let turn = 0;

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
  if (key === 'w' || key === 's' || key === 'ArrowUp') {
    vertical = 0;
  } else if (key === 'a' || key === 'd' || key === 'ArrowLeft') {
    horizontal = 0;
  } else if (key === 'q' || key === 'e') {
    turn = 0;
  }
}

// TODO: add event listeners

window.addEventListener('load', () => initialize());