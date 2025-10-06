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
let worldFromPoseRecent: Matrix4;
let attributes: VertexAttributes;

let model: gltf.Model
let vao: VertexArray;
let worldFromPoseList: Matrix4[] = [];

// Reference to the element displaying gamepad info
let gamepadInfo: HTMLElement = document.getElementById('gamepad-info') as HTMLElement;




async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  model = await gltf.Model.readFromUrl('model/Character.gltf');
  attributes =new VertexAttributes();
  attributes.addAttribute('position', model.meshes[0].positions.count, 3, model.meshes[0].positions.buffer);
  attributes.addAttribute('normal', model.meshes[0].normals!.count, 3, model.meshes[0].normals!.buffer);
  attributes.addAttribute('weights', model.meshes[0].weights!.count, 4, model.meshes[0].weights!.buffer);
  attributes.addAttribute('joints', model.meshes[0].joints!.count, 4, new Float32Array(model.meshes[0].joints!.buffer));
  if (model.meshes[0].colors) {
    attributes.addAttribute('color', model.meshes[0].colors.count, 3, model.meshes[0].colors.buffer);
    //console.log(model.meshes[0].colors.count, 3, model.meshes[0].colors.buffer);
    //console.log(model.meshes[0].positions.count, 3, model.meshes[0].positions.buffer)
  }
  attributes.addIndices(new Uint32Array(model.meshes[0].indices!.buffer));

  vao = new VertexArray(shaderProgram, attributes);
  model.play('ArmatureAction');

  eyeFromWorld = Matrix4.identity();
  //wordFromPoseList = [];

  // Set up event listeners BEFORE calling resizeCanvas
  window.addEventListener('resize', () => resizeCanvas());


  
  resizeCanvas();  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}


function render_new() {
  //CREATE ARRAY OF WORLDFROMPOSE marticies 
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  vao = new VertexArray(shaderProgram, attributes);
  model.play('ArmatureAction');
  // Create a proper copy, not a reference

  if (worldFromPose != null) {
    worldFromPoseList.push(worldFromPose);
    worldFromPose = Matrix4.identity();
    worldFromPose = worldFromPose.multiplyMatrix(Matrix4.scale(0.25, 0.25, 1));
    worldFromPose= worldFromPose.multiplyMatrix(Matrix4.translate(0, -10, 0));
    worldFromPose = worldFromPose.multiplyMatrix(Matrix4.rotateY(90));
  }
  else {
    worldFromPose = Matrix4.identity();
    worldFromPose = worldFromPose.multiplyMatrix(Matrix4.scale(0.25, 0.25, 1));
    worldFromPose= worldFromPose.multiplyMatrix(Matrix4.translate(0, -10, 0));
    worldFromPose = worldFromPose.multiplyMatrix(Matrix4.rotateY(90));
    //worldFromPoseList.push(worldFromPose);
  }

}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  shaderProgram.bind();
  
  // Create a proper copy, not a reference
  //worldFromPose = Matrix4.identity().multiplyMatrix(worldFromPose);
  //worldFromPose = worldFromPose.multiplyMatrix(Matrix4.translate(0, 8, -5.1));
  //worldFromPose = worldFromPose.multiplyMatrix(Matrix4.scale(1, 0.5, 0.5));
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements);
  for (let [i, matrix] of model.skinTransforms(300).entries()) {
    shaderProgram.setUniformMatrix4fv(`jointTransforms[${i}]`, matrix.elements);
  }
  shaderProgram.setUniformMatrix4fv('worldFromPose', worldFromPose.elements);
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  //shaderProgram.setUniformMatrix4fv('worldFromPose', Matrix4.identity().elements)
  for (let worldFromPose of worldFromPoseList) {
    //console.log(worldFromPose);
    shaderProgram.setUniformMatrix4fv('worldFromPose', worldFromPose.elements);
    vao.bind();
    vao.drawIndexed(gl.TRIANGLES);
    vao.unbind();
  }
  shaderProgram.unbind();
}

let wasPressed = false;
let then: DOMHighResTimeStamp | null = null;
const speed = 0.01;

function animate(_now: DOMHighResTimeStamp) {
  const gamepads = navigator.getGamepads();
  const gamepad = gamepads[0];
  //console.log(gamepad);
  if (gamepad) {
    const isPressed = gamepad.buttons[3].pressed;
    //axes under label named axes
    //console.log(gamepad.axes[0]);
    if(gamepad.axes[0] > 0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.translate(0.5, 0, 0));
      render();
    }
    else if(gamepad.axes[0] < -0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.translate(-0.5, 0, 0));
      render();
    }
    else if(gamepad.axes[3] > 0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.translate(0, -0.5, 0));
      render();
    }
    else if(gamepad.axes[3] < -0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.translate(0, 0.5, 0));
      render();
    }
    else if(gamepad.axes[2] > 0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.rotateY(1));
      render();
    }
    else if(gamepad.axes[2] < -0.1 ) {
      worldFromPose = worldFromPose.multiplyMatrix(Matrix4.rotateY(1));
      render();
    }
    else if(isPressed && !wasPressed) {
      render_new();
      render();
    }
    wasPressed = isPressed;
  }

  //console.log(gamepads);

  requestAnimationFrame(animate);
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  const size = 7;
  const center = [0, 0];
  if (aspectRatio >= 1) {
    clipFromEye = Matrix4.ortho(center[0] - size * aspectRatio, center[0] + size * aspectRatio, center[1] - size, center[1] + size, -100, 100);
  } else {
    clipFromEye = Matrix4.ortho(center[0] - size, center[0] + size, center[1] - size / aspectRatio, center[1] + size / aspectRatio, -10, 10);
  }
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