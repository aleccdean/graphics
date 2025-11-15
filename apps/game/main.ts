import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchImage, fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Trimesh } from 'lib/trimesh.js';
import { Prefab } from 'lib/prefab.js';
import { Matrix4 } from 'lib/matrix.js';
import { Vector3, Vector4 } from 'lib/vector.js';
import { FirstPersonCamera } from 'lib/terrainCamera.js';
import { Field2 } from 'lib/field.js';
import * as gltf from 'lib/gltf.js';
import { SceneModel } from 'lib/model.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromEye: Matrix4;
let vao: VertexArray;
let modelInstances: SceneModel[] = []; //List of all models in scene 
let cameraRightModel: SceneModel | null = null;
let cameraLeftModel: SceneModel | null = null;
let worldFromModelRight: Matrix4;
let worldFromModelLeft: Matrix4;
let cameraRight: FirstPersonCamera;
let cameraLeft: FirstPersonCamera;
let rightPlayerAlive: boolean = true;
let leftPlayerAlive: boolean = true;
let heightmap: Field2;
let hMap: Trimesh;
let lightPosition: Vector3;
// speed variables
let moveSpeed = 100;                             
let turnSpeedDeg = 240;  
let npcSpeed = 20;
// These will be -1, 0, or 1.
let horizontalRight = 0;
let verticalRight = 0;
let turnRight = 0;
let horizontalLeft = 0;
let verticalLeft = 0;
let turnLeft = 0;
let attributes: VertexAttributes;
let terrainScale: Vector3;
let grassTexture: WebGLTexture | null = null;
let crosshairLeft: HTMLDivElement | null = null;
let crosshairRight: HTMLDivElement | null = null;
// hit cooldown state
let lastHitRightSec = -Infinity;
let lastHitLeftSec = -Infinity;
let hitCooldownSec = 1.0;
let hitRadius = 2.0;
// shoot cooldown
let lastShootRightSec = -Infinity;
let lastShootLeftSec = -Infinity;
let shootCooldown = 0.5;


async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
  crosshairLeft = document.getElementById('crosshair-left') as HTMLDivElement;
  crosshairRight = document.getElementById('crosshair-right') as HTMLDivElement;

  //Read heightmap
  const image = await fetchImage('heightmap.png');
  const scale = new Vector3(2, 150, 2);
  terrainScale = scale;
  heightmap = Field2.readFromImage(image);
  hMap = heightmap.toTrimesh(scale);
  //read texture for heightmap
  const texImage = await fetchImage('textures/grass2.jpg')
  grassTexture = createRgbaTexture2d(texImage.width, texImage.height, texImage);

  //Initialize both player cameras
  cameraRight = new FirstPersonCamera(new Vector3(0,10, 0), new Vector3(5, 10, 5), heightmap, 1.5, scale);
  cameraLeft = new FirstPersonCamera(new Vector3(0,10, 0), new Vector3(5, 10, 5), heightmap, 1.5, scale);
  
  worldFromModelRight = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,0));
  worldFromModelLeft = Matrix4.identity().multiplyMatrix(Matrix4.translate(0,0,0));
  attributes = new VertexAttributes();
  hMap.computeNormals();
  attributes.addAttribute('position', hMap.vertexCount, 3, hMap.positionBuffer());
  attributes.addAttribute('normal', hMap.vertexCount, 3, hMap.normalBuffer());
  // texture coords are 2 components (u,v)
  attributes.addAttribute('texPosition', hMap.textureCount!, 2, hMap.textureBuffer());
  attributes.addIndices(hMap.faceBuffer());

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  lightPosition = new Vector3(0.0, 0.0, 0.0);
  vao = new VertexArray(shaderProgram, attributes);
  await models();
  
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', () => {
    document.body.requestPointerLock();
  });
  // Create things with a click release
  window.addEventListener('pointerup', onMouseUp);
  
  window.addEventListener('pointermove', event => {
    if (document.pointerLockElement) {
      // rotate camera and keep crosshair centered in right viewport
      cameraRight.yaw(-event.movementX * 0.5);
      cameraRight.pitch(-event.movementY * 0.5);
      if (crosshairRight) {
            crosshairRight.style.left = '75vw';
            crosshairRight.style.top = '50vh';
          }
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

  const lightPositionEye = cameraRight.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  //shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  //shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform1f("ambientFactor", 0.1);
  // Terrain uses grassTexture (unit 0) and no model texture / vertex color
  shaderProgram.setUniform1i("grassTexture", 0);
  shaderProgram.setUniform1i("modelTexture", 1);
  shaderProgram.setUniform1i("useModelTexture", 0);
  shaderProgram.setUniform1i("useVertexColor", 0);
  if (grassTexture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, grassTexture);
  }
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelRight.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraRight.eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  if (modelInstances.length > 0) {
    for (const inst of modelInstances) {
      if (inst === cameraRightModel) continue; // don't draw right player's own snowman in right view
      shaderProgram.setUniformMatrix4fv('worldFromModel', inst.worldFromModel.elements);
      if (inst.modelTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, inst.modelTexture);
        shaderProgram.setUniform1i('useModelTexture', 1);
        shaderProgram.setUniform1i('useVertexColor', 0);
        shaderProgram.setUniform1i('modelTexture', 1);
      } else if (inst.hasVertexColor) {
        shaderProgram.setUniform1i('useModelTexture', 0);
        shaderProgram.setUniform1i('useVertexColor', 1);
      } else {
        shaderProgram.setUniform1i('useModelTexture', 0);
        shaderProgram.setUniform1i('useVertexColor', 0);
      }
      inst.vao.bind();
      inst.vao.drawIndexed(gl.TRIANGLES);
      inst.vao.unbind();
    }
  }
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

  const lightPositionEye = cameraLeft.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  //shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  //shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform1f("ambientFactor", 0.1);
  // Default to terrain texture on unit 0; model texture (if present) will be bound to unit 1
  shaderProgram.setUniform1i("grassTexture", 0);
  shaderProgram.setUniform1i("modelTexture", 1);
  shaderProgram.setUniform1i("useModelTexture", 0);
  shaderProgram.setUniform1i("useVertexColor", 0);
  if (grassTexture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, grassTexture);
  }
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelLeft.elements)
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraLeft.eyeFromWorld.elements)
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  if (modelInstances.length > 0) {
    for (const inst of modelInstances) {
      if (inst === cameraLeftModel) continue; // don't draw left player's own snowman in left view
      shaderProgram.setUniformMatrix4fv('worldFromModel', inst.worldFromModel.elements);
      if (inst.modelTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, inst.modelTexture);
        shaderProgram.setUniform1i('useModelTexture', 1);
        shaderProgram.setUniform1i('useVertexColor', 0);
        shaderProgram.setUniform1i('modelTexture', 1);
      } else if (inst.hasVertexColor) {
        shaderProgram.setUniform1i('useModelTexture', 0);
        shaderProgram.setUniform1i('useVertexColor', 1);
      } else {
        shaderProgram.setUniform1i('useModelTexture', 0);
        shaderProgram.setUniform1i('useVertexColor', 0);
      }
      inst.vao.bind();
      inst.vao.drawIndexed(gl.TRIANGLES);
      inst.vao.unbind();
    }
  }
  shaderProgram.unbind();
}

async function models() {
  // Read the glTF and wrap the first mesh in a SceneModel which builds its own VAO
  const model = await gltf.Model.readFromUrl('models/Snowman.gltf');
  const count = 5;
  //Creates count random models
  modelInstances = [];
  for (let i = 0; i < count; ++i) {
    const inst = new SceneModel(model.meshes[0], shaderProgram, true, 20, heightmap, terrainScale);
    modelInstances.push(inst);
  }
  
  //Create player characters
  if (cameraRight && cameraLeft) {
    cameraRightModel = new SceneModel(model.meshes[0], shaderProgram, false, 20, heightmap, terrainScale);
    cameraRightModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraRight.from.x, cameraRight.from.y, cameraRight.from.z));
    modelInstances.push(cameraRightModel);

    cameraLeftModel = new SceneModel(model.meshes[0], shaderProgram, false, 20, heightmap, terrainScale);
    cameraLeftModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraLeft.from.x, cameraLeft.from.y, cameraLeft.from.z));
    modelInstances.push(cameraLeftModel);
  }

}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const halfWidth = canvas.width /2;
  const aspectRatio = halfWidth / canvas.clientHeight;
  clipFromEye = Matrix4.perspective(90, aspectRatio, 0.1, 2000);
  renderRight();
  renderLeft();
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  const deltaSeconds = elapsed / 1000; 

  //Keyboard controls To be removed
  cameraRight.update(deltaSeconds);
  cameraLeft.update(deltaSeconds);
  animateGamepad(now, deltaSeconds, turnSpeedDeg, moveSpeed);
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
  // end of keyboard controls

  // Update camera-anchored models so they follow their respective cameras.
  if (cameraRightModel && cameraRight) {
    cameraRight.reorient();
    cameraRightModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraRight.from.x, cameraRight.from.y - 1.5, cameraRight.from.z));
  }
  if (cameraLeftModel && cameraLeft) {
    cameraRight.reorient();
    cameraLeftModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraLeft.from.x, cameraLeft.from.y - 1.5, cameraLeft.from.z));
  }
  // Move zombies toward nearest camera
  for (const inst of modelInstances) {
    if (inst === cameraRightModel || inst === cameraLeftModel) continue;
    const pos = inst.getPosition();
    let target: FirstPersonCamera | null = null;
    if(rightPlayerAlive && leftPlayerAlive) {
      target = pos.subtract(cameraRight.from).magnitude < pos.subtract(cameraLeft.from).magnitude ? cameraRight : cameraLeft;
    }
    else if(leftPlayerAlive) {
      target = cameraLeft;
    }
    else if(rightPlayerAlive) {
      target = cameraRight;
    }
    if(target == null) continue;
    const toTarget = target.from.subtract(pos);
    const dist = Math.max(0.001, toTarget.magnitude);
    const step = Math.min(dist, npcSpeed * deltaSeconds);
    const dir = toTarget.scalarMultiply(1 / dist);
    let newX = pos.x + dir.x * step;
    let newZ = pos.z + dir.z * step;
    inst.setPosition(new Vector3(newX, 0, newZ));
    // Check if enemy close enough to hit, and if out of cooldown range.
    if (dist < hitRadius) {
      const nowSec = (now as number) / 1000;
      if (target === cameraLeft) {
        if (nowSec - lastHitLeftSec >= hitCooldownSec) {
          cameraLeftModel?.takeDamage?.(1);
          console.log('hit left', cameraLeftModel?.health);
          lastHitLeftSec = nowSec;
        }
      } else if (target === cameraRight) {
        if (nowSec - lastHitRightSec >= hitCooldownSec) {
          cameraRightModel?.takeDamage?.(1);
          console.log('hit right', cameraRightModel?.health);
          lastHitRightSec = nowSec;
        }
      }
    }
  
  }
  modelInstances = modelInstances.filter(inst => {
    if (inst.health <= 0) {
      inst.destroy();
      if (inst === cameraLeftModel) cameraLeftModel = null;
      if (inst === cameraRightModel) cameraRightModel = null;
      return false; // remove from array
    }
    return true;
  });
  resizeCanvas();
  requestAnimationFrame(animate);
  then = now;
}


function animateGamepad(now: DOMHighResTimeStamp, deltaSeconds: number, turnSpeedDeg: number, moveSpeed: number) {
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
          if (crosshairLeft) {
            crosshairLeft.style.left = '25vw';
            crosshairLeft.style.top = '50vh';
          }
        }
        if(gamepadLeft.axes[2] < -0.1 ) {
          cameraLeft.yaw(-gamepadLeft.axes[2] * deltaSeconds * turnSpeedDeg);
          if (crosshairLeft) {
            crosshairLeft.style.left = '25vw';
            crosshairLeft.style.top = '50vh';
          }
        }
        if(gamepadLeft.axes[3] > 0.1 ) {
          cameraLeft.pitch(-gamepadLeft.axes[3] * deltaSeconds * turnSpeedDeg);
          if (crosshairLeft) {
            crosshairLeft.style.left = '25vw';
            crosshairLeft.style.top = '50vh';
          }
        }
        if(gamepadLeft.axes[3] < -0.1 ) {
          cameraLeft.pitch(-gamepadLeft.axes[3] * deltaSeconds * turnSpeedDeg);
          if (crosshairLeft) {
            crosshairLeft.style.left = '25vw';
            crosshairLeft.style.top = '50vh';
          }
        }
        if(gamepadLeft.buttons[0].pressed) { // A/X to Jump
          cameraLeft.jump();
        }
        if(gamepadLeft.buttons[7].pressed) { // Right trigger to shoot
          shoot(now, cameraLeft);
        }
        //add button features
  }
  if ( gamepadRight) {
        //first 4 control moving around
        if( gamepadRight.axes[0] > 0.1 ) {
          cameraRight.strafe( gamepadRight.axes[0] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[0] < -0.1 ) {
          cameraRight.strafe( gamepadRight.axes[0] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[1] > 0.1 ) {
          cameraRight.advance(- gamepadRight.axes[1] * deltaSeconds * moveSpeed);
        }
        if( gamepadRight.axes[1] < -0.1 ) {
          cameraRight.advance(- gamepadRight.axes[1] * deltaSeconds * moveSpeed);
        } 
        //next 4 control looking around
        if( gamepadRight.axes[2] > 0.1 ) { 
          cameraRight.yaw(- gamepadRight.axes[2] * deltaSeconds * turnSpeedDeg);
          if (crosshairRight) {
            crosshairRight.style.left = '75vw';
            crosshairRight.style.top = '50vh';
          }
        }
        if( gamepadRight.axes[2] < -0.1 ) {
          cameraRight.yaw(- gamepadRight.axes[2] * deltaSeconds * turnSpeedDeg);
          if (crosshairRight) {
            crosshairRight.style.left = '75vw';
            crosshairRight.style.top = '50vh';
          }
        }
        if( gamepadRight.axes[3] > 0.1 ) {
          cameraRight.pitch(- gamepadRight.axes[3] * deltaSeconds * turnSpeedDeg);
          if (crosshairRight) {
            crosshairRight.style.left = '75vw';
            crosshairRight.style.top = '50vh';
          }
        }
        if( gamepadRight.axes[3] < -0.1 ) {
          cameraRight.pitch(- gamepadRight.axes[3] * deltaSeconds * turnSpeedDeg);
          if (crosshairRight) {
            crosshairRight.style.left = '75vw';
            crosshairRight.style.top = '50vh';
          }
        }
        if(gamepadRight.buttons[0].pressed) {
          cameraRight.jump();
        }
        if(gamepadRight.buttons[7].pressed) {
          shoot(now, cameraRight);
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



function createRgbaTexture2d(width: number, height: number, image: HTMLImageElement | Uint8ClampedArray, textureUnit: GLenum = gl.TEXTURE0) {
  gl.activeTexture(textureUnit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image as any);

  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

function intersectRayBox(rayStart: Vector3, rayDirection: Vector3, boxMin: Vector3, boxMax: Vector3) {
  // Intersect the ray with the left and right planes.
  let t0 = (boxMin.x - rayStart.x) / rayDirection.x;
  let t1 = (boxMax.x - rayStart.x) / rayDirection.x;

  // Swap to keep t0 the smaller of the two.
  if (t0 > t1) {
    const tmp = t0;
    t0 = t1;
    t1 = tmp;
  }

  // Intersect the ray with the bottom and top planes.
  let ty0 = (boxMin.y - rayStart.y) / rayDirection.y;
  let ty1 = (boxMax.y - rayStart.y) / rayDirection.y;

  if (ty0 > ty1) {
    const tmp = ty0;
    ty0 = ty1;
    ty1 = tmp;
  }

  // If we've exited one dimension before starting another, bail.
  if (t0 > ty1 || ty0 > t1) return [];

  // Keep greater t*0 and smaller t*1.
  if (ty0 > t0) t0 = ty0;
  if (ty1 < t1) t1 = ty1;

  // Intersect the ray with the near and far planes.
  let tz0 = (boxMin.z - rayStart.z) / rayDirection.z;
  let tz1 = (boxMax.z - rayStart.z) / rayDirection.z;

  if (tz0 > tz1) {
    const tmp = tz0;
    tz0 = tz1;
    tz1 = tmp;
  }

  // If we've exited one dimension before starting another, bail.
  if (t0 > tz1 || tz0 > t1) return [];

  // Keep greater t*0 and smaller t*1.
  if (tz0 > t0) t0 = tz0;
  if (tz1 < t1) t1 = tz1;

  // Locate two points on ray.
  return [
    rayStart.add(rayDirection.scalarMultiply(t0)),
    rayStart.add(rayDirection.scalarMultiply(t1)),
  ];
}

function shoot(now:DOMHighResTimeStamp,camera: FirstPersonCamera) {
  const rayStart: Vector3 = camera.from.clone();
  const dir: Vector3 = camera.forward.normalize();
  const nowSec = (now as number) / 1000;

  if (camera === cameraLeft) {
        if (nowSec - lastShootLeftSec >= shootCooldown) {
          for (const inst of modelInstances) {
            // Skip the right player's own model to avoid self-intersection
            if (inst === cameraLeftModel || inst === cameraRightModel) continue;
            const bounds = inst.getWorldBounds();
            const points = intersectRayBox(rayStart, dir, bounds.min, bounds.max);
            if (points.length > 0) {
              inst.takeDamage(1);
              console.log(inst.health)
            }
          }
          lastShootLeftSec = nowSec;
        }
      } 
      else if (camera === cameraRight) {
        if (nowSec - lastShootRightSec >= shootCooldown) {
          for (const inst of modelInstances) {
            // Skip the right player's own model to avoid self-intersection
            if (inst === cameraLeftModel || inst === cameraRightModel) continue;
            const bounds = inst.getWorldBounds();
            const points = intersectRayBox(rayStart, dir, bounds.min, bounds.max);
            if (points.length > 0) {
              inst.takeDamage(1);
            }
          }
          lastShootRightSec = nowSec;
        }
      }
}

function onMouseUp(_event: MouseEvent) {
  // Ray starts at the right camera position and points along its forward vector
  const rayStart: Vector3 = cameraRight.from.clone();
  const dir: Vector3 = cameraRight.forward.normalize();

  for (const inst of modelInstances) {
    // Skip the right player's own model to avoid self-intersection
    if (inst === cameraRightModel) continue;
    const bounds = inst.getWorldBounds();
    const points = intersectRayBox(rayStart, dir, bounds.min, bounds.max);
    if (points.length > 0) {
      console.log("intersection", points)
    }
  }
}



window.addEventListener('load', () => initialize());
