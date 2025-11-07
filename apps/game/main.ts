import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchImage, fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3 } from 'lib/vector.js';
import { FirstPersonCamera } from 'lib/terrainCamera.js';
import { Field2 } from 'lib/field.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromEye: Matrix4;
let vao: VertexArray;
let worldFromModelRight: Matrix4;
let worldFromModelLeft: Matrix4;
let cameraRight: FirstPersonCamera;
let cameraLeft: FirstPersonCamera;
let heightmap: Field2;
let hMap: Trimesh;
let lightPosition: Vector3;
// These will be -1, 0, or 1.
let horizontalRight = 0;
let verticalRight = 0;
let turnRight = 0;
let horizontalLeft = 0;
let verticalLeft = 0;
let turnLeft = 0;

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
  cameraRight = new FirstPersonCamera(from, to, heightmap, 1, scale);
  cameraLeft = new FirstPersonCamera(from, to, heightmap, 1, scale);
  // console.log(camera.right);

  
  const texImage = await fetchImage('textures/grass.jpg')
  const tex = createRgbaTexture2d(texImage.width, texImage.height, texImage);
  
  worldFromModelRight = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,0));
  worldFromModelLeft = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,0));
  const attributes = new VertexAttributes();
  hMap.computeNormals();
  attributes.addAttribute('position', hMap.vertexCount, 3, hMap.positionBuffer());
  attributes.addAttribute('normal', hMap.vertexCount, 3, hMap.normalBuffer());
  attributes.addAttribute('texPosition', hMap.textureCount!, 3, hMap.textureBuffer());
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
    cameraRight.yaw(-event.movementX * 0.5);
    cameraRight.pitch(-event.movementY * 0.5);
    // console.log(camera.eyeFromWorld);
    renderRight();
    renderLeft();
  }
});

  resizeCanvas();  
  requestAnimationFrame(animate);
}

function renderRight() {
  const halfWidth = canvas.width/2;
  gl.enable(gl.SCISSOR_TEST);
  gl.viewport(halfWidth, 0, halfWidth, canvas.height);
  gl.scissor(halfWidth, 0, halfWidth, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const lightPositionEye = cameraRight.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("ambientFactor", 0.1);
  //shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniform1i("grassTexture", 0);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelRight.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraRight.eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  shaderProgram.unbind();
}

function renderLeft() {
  const halfWidth = canvas.width/2;
  gl.enable(gl.SCISSOR_TEST);
  gl.viewport(0, 0, halfWidth, canvas.height);
  gl.scissor(0, 0, halfWidth, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const lightPositionEye = cameraLeft.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("ambientFactor", 0.1);
  //shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniform1i("grassTexture", 0);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelLeft.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraLeft.eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  shaderProgram.unbind();
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth / 2;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  clipFromEye = Matrix4.perspective(90, aspectRatio, 0.01, 2000);
  renderRight();
  renderLeft();
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  // update animated state
  const deltaSeconds = elapsed / 1000;               // convert ms -> s
  const moveSpeed = 10;                             // units per second
  const turnSpeedDeg = 90;                           // degrees per second
  animateGamepad(deltaSeconds, turnSpeedDeg, moveSpeed);
  cameraRight.advance(verticalRight * deltaSeconds * moveSpeed);
  cameraRight.strafe(horizontalRight * deltaSeconds * moveSpeed);
  cameraLeft.advance(verticalLeft * deltaSeconds * moveSpeed);
  cameraLeft.strafe(horizontalLeft * deltaSeconds * moveSpeed);
  if (turnRight !== 0) {
    cameraRight.yaw(turnRight * deltaSeconds * turnSpeedDeg);
  }
  if (turnLeft !== 0) {
    cameraLeft.yaw(turnLeft * deltaSeconds * turnSpeedDeg);
  }
  resizeCanvas();
  requestAnimationFrame(animate);
  then = now;
}


function animateGamepad(deltaSeconds: number, turnSpeedDeg: number, moveSpeed: number) {
  const gamepads = navigator.getGamepads();
  const gamepadLeft = gamepads[0];
  const gamepadRight = gamepads[1];
  if (gamepadLeft) {
        //first 4 control moving around
        if(gamepadLeft.axes[0] > 0.1 ) {
          cameraLeft.strafe(gamepadLeft.axes[0] * deltaSeconds * moveSpeed);
        }
        if(gamepadLeft.axes[0] < -0.1 ) {
          cameraLeft.strafe(gamepadLeft.axes[0] * deltaSeconds * moveSpeed);
        }
        if(gamepadLeft.axes[1] > 0.1 ) {
          cameraLeft.advance(-gamepadLeft.axes[1] * deltaSeconds * moveSpeed);
        }
        if(gamepadLeft.axes[1] < -0.1 ) {
          cameraLeft.advance(-gamepadLeft.axes[1] * deltaSeconds * moveSpeed);
        } 
        //next 4 control looking around
        if(gamepadLeft.axes[2] > 0.1 ) { 
          cameraLeft.yaw(-gamepadLeft.axes[2] * deltaSeconds * turnSpeedDeg);
          renderLeft();
        }
        if(gamepadLeft.axes[2] < -0.1 ) {
          cameraLeft.yaw(-gamepadLeft.axes[2] * deltaSeconds * turnSpeedDeg);
        }
        if(gamepadLeft.axes[3] > 0.1 ) {
          cameraLeft.pitch(-gamepadLeft.axes[3] * deltaSeconds * turnSpeedDeg);
        }
        if(gamepadLeft.axes[3] < -0.1 ) {
          cameraLeft.pitch(-gamepadLeft.axes[3] * deltaSeconds * turnSpeedDeg);
        }
        //add button features
  }
  if ( gamepadRight) {
        //first 4 control moving around
        if( gamepadRight.axes[0] > 0.1 ) {
          cameraLeft.strafe( gamepadRight.axes[0] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[0] < -0.1 ) {
          cameraLeft.strafe( gamepadRight.axes[0] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[1] > 0.1 ) {
          cameraLeft.advance(- gamepadRight.axes[1] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[1] < -0.1 ) {
          cameraLeft.advance(- gamepadRight.axes[1] * deltaSeconds * moveSpeed);
        } 
        //next 4 control looking around
        if( gamepadRight.axes[2] > 0.1 ) { 
          cameraLeft.yaw(- gamepadRight.axes[2] * deltaSeconds * turnSpeedDeg);
          renderLeft();
        }
        if( gamepadRight.axes[2] < -0.1 ) {
          cameraLeft.yaw(- gamepadRight.axes[2] * deltaSeconds * turnSpeedDeg);
        }
        if( gamepadRight.axes[3] > 0.1 ) {
          cameraLeft.pitch(- gamepadRight.axes[3] * deltaSeconds * turnSpeedDeg);
        }
        if( gamepadRight.axes[3] < -0.1 ) {
          cameraLeft.pitch(- gamepadRight.axes[3] * deltaSeconds * turnSpeedDeg);
        }
        //add button features
  }
  resizeCanvas();
}



//ADD function for two controllers from stick-shift lab
function onKeyDown(event: KeyboardEvent) {
  const key = event.key;
  if (key === 'ArrowUp') {
    verticalRight = 1;
  } else if (key === 'ArrowDown') {
    verticalRight = -1;
  } else if (key === 'ArrowLeft') {
    horizontalRight = -1;
  } else if (key === 'ArrowRight') {
    horizontalRight = 1;
  }  else if(key == 'w') {
    verticalLeft = 1;
  } else if (key === 's') {
    verticalLeft = -1;
  } else if (key === 'a') {
    horizontalLeft = -1;
  } else if (key === 'd') {
    horizontalLeft = 1;
  }
  renderRight();
  renderLeft();
}

function onKeyUp(event: KeyboardEvent) {
  const key = event.key;
  if (key === 'ArrowUp' || key == 'ArrowDown') {
    verticalRight = 0;
  } else if ( key === 'ArrowLeft' || key == 'ArrowRight') {
    horizontalRight = 0;
  } else if (key === 'q' || key === 'e') {
    turnRight = 0;
  } else if (key === 'w' || key === 's' ) {
    verticalLeft = 0;
  } else if (key === 'a' || key === 'd' ) {
    horizontalLeft = 0;
  } 
}


function generateRgbaImage(width: number, height: number) {
  const n = width * height * 4;
  const pixels = new Uint8ClampedArray(n);

  for (let r = 0; r < height; ++r) {
    for (let c = 0; c < width; ++c) {
      let i = (r * width + c) * 4;
      pixels[i + 0] = r ^ c;
      pixels[i + 1] = 128;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }

  return pixels;
}

function createRgbaTexture2d(width: number, height: number, image: HTMLImageElement | Uint8ClampedArray, textureUnit: GLenum = gl.TEXTURE0) {
  gl.activeTexture(textureUnit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image as any);

  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

window.addEventListener('load', () => initialize());
