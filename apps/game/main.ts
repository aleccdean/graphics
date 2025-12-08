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
let then: DOMHighResTimeStamp | null = null;
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let skyboxProgram: ShaderProgram;
let depthProgram: ShaderProgram; // For shadows
let billboardProgram: ShaderProgram;

let skyboxVao: VertexArray;
let vao: VertexArray;
let plantVao: VertexArray;
let particleVao: VertexArray | null = null;
let terrainDepthVao: VertexArray | null = null;

let modelInstances: SceneModel[] = []; //List of all models in scene 
let clipFromEye: Matrix4;
// Shadows matrices
let lightCamera: FirstPersonCamera;
let lightFromWorld: Matrix4;
let clipFromLight: Matrix4;
let textureFromWorld: Matrix4;
let depthFramebuffer: WebGLFramebuffer | null = null;
let depthWidth = 1024;
let depthHeight = 1024;

// Create variables for left and right players
let cameraRightModel: SceneModel | null = null;
let cameraLeftModel: SceneModel | null = null;
let cameraRightGun: SceneModel | null = null;
let cameraLeftGun: SceneModel | null = null;
let worldFromModelRight: Matrix4;
let worldFromModelLeft: Matrix4;
let cameraRight: FirstPersonCamera;
let cameraLeft: FirstPersonCamera;
let rightPlayerAlive: boolean = true;
let leftPlayerAlive: boolean = true;
let crosshairLeft: HTMLDivElement | null = null;
let crosshairRight: HTMLDivElement | null = null;
// Kill counts and UI
let killCountLeft = 0;
let killCountRight = 0;
let killLeftEl: HTMLElement | null = null;
let killRightEl: HTMLElement | null = null;

let heightmap: Field2;
let hMap: Trimesh;
let lightPosition: Vector3;
// These will be -1, 0, or 1. Keyboard input only to be removed
let horizontalRight = 0;
let verticalRight = 0;
let turnRight = 0;
let horizontalLeft = 0;
let verticalLeft = 0;
let turnLeft = 0;
// End keyboard variables

let attributes: VertexAttributes;
let terrainScale: Vector3;
let grassTexture: WebGLTexture | null = null;
let skyboxTexture: WebGLTexture | null = null;
let plantTexture: WebGLTexture | null = null;
let depthTexture: WebGLTexture | null = null;
let particleTexture: WebGLTexture | null = null;
//cooldown states
let lastHitRightSec = -Infinity;
let lastHitLeftSec = -Infinity;
let lastShootRightSec = -Infinity;
let lastShootLeftSec = -Infinity;
let lastRoundSec = -Infinity;
//constants
const hitCooldownSec = 0.6;
const hitRadius = 3.5;
const moveSpeed = 30;                             
const turnSpeedDeg = 160;  
const npcSpeed = 15;
const shootCooldown = 0.2;
const roundCooldown = 25;
const particlesPerShot = 20;
// Texture units
const grassTextureUnit = 1;
const skyboxTextureUnit = 2;
const depthTextureUnit = 3;
const plantTextureUnit = 4;
const particleTextureUnit = 5;
// Particle system
type Particle = {
  position: Vector3;
  velocity: Vector3;
  scale: number;
  life: number;
  owner: FirstPersonCamera; //left or right
  color?: Vector4;
}
let particles: Particle[] = [];


async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
  crosshairLeft = document.getElementById('crosshair-left') as HTMLDivElement;
  crosshairRight = document.getElementById('crosshair-right') as HTMLDivElement;

  //Read heightmap
  const image = await fetchImage('heightmap.png');
  terrainScale = new Vector3(2, 150, 2);
  heightmap = Field2.readFromImage(image);
  hMap = heightmap.toTrimesh(terrainScale);
  //read texture for heightmap
  const texImage = await fetchImage('textures/grass2.jpg')
  grassTexture = createRgbaTexture2d(texImage.width, texImage.height, texImage,gl.TEXTURE1);

  //Skybox 
  const skyboxVertexSource = await fetchText('skybox-vertex.glsl');
  const skyboxFragmentSource = await fetchText('skybox-fragment.glsl');
  skyboxProgram = new ShaderProgram(skyboxVertexSource, skyboxFragmentSource);
  skyboxTexture = await loadCubemap('cubemap','jpg',gl.TEXTURE2)
  const skybox = Prefab.skybox(); 
  const skyboxAttributes = new VertexAttributes();
  skybox.computeNormals();
  skyboxAttributes.addAttribute('position', skybox.vertexCount, 3, skybox.positionBuffer());
  skyboxAttributes.addAttribute('normal', skybox.vertexCount, 3, skybox.normalBuffer());
  skyboxAttributes.addIndices(skybox.faceBuffer());
  skyboxVao= new VertexArray(skyboxProgram, skyboxAttributes);



  // Billboarding
  const billboardVertexSource = await fetchText('billboard-vertex.glsl');
  const billboardFragmentSource = `
 precision mediump float;
 in vec2 mixTexPosition;
 uniform sampler2D billboardTexture;
 out vec4 fragmentColor;
 void main() {
   vec4 c = texture(billboardTexture, mixTexPosition);
   if (c.a < 0.05) discard;
   fragmentColor = c;
 }
  `;
  billboardProgram = new ShaderProgram(billboardVertexSource, billboardFragmentSource);
  const plantImg = await fetchImage('textures/plant.png');
  plantTexture = createRgbaTexture2d(plantImg.width, plantImg.height, plantImg, gl.TEXTURE4);
  plantVao = plants(250, heightmap.width * terrainScale.x, heightmap.height * terrainScale.z);


  // Particles
  const particleImg = await fetchImage('textures/bullet.png');
  particleTexture = createRgbaTexture2d(particleImg.width, particleImg.height, particleImg, gl.TEXTURE5);
  const particlePos = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
      -0.5,  0.5, 0,
       0.5,  0.5, 0,
    ]);
    const particleTexPos = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    const particleAttributes = new VertexAttributes();
    particleAttributes.addAttribute('position', 4, 3, particlePos);
    particleAttributes.addAttribute('texPosition', 4, 2, particleTexPos);
    particleAttributes.addIndices(new Uint32Array([0, 1, 3, 0, 3, 2]));
    // reuse billboardProgram so particles behave like billboards
    particleVao = new VertexArray(billboardProgram, particleAttributes);


  //Initialize both player cameras
  cameraRight = new FirstPersonCamera(new Vector3(0,10, 0), new Vector3(50, 10, 50), heightmap, 3, terrainScale);
  cameraLeft = new FirstPersonCamera(new Vector3(5,10, 5), new Vector3(50, 10, 50), heightmap, 3, terrainScale);
  
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


    // Shadows
  depthWidth = 1024;
  depthHeight = 1024;
  lightPosition = new Vector3(200.0, 400.0, 200.0);
  const lightTarget = new Vector3(200.0, 0.0, 200.0);
  const lightForward = lightTarget.subtract(lightPosition).normalize();
  lightFromWorld = Matrix4.look(lightPosition, lightForward, new Vector3(0, 1, 0));
  clipFromLight = Matrix4.perspective(45, 1, 0.1, 1000);
  const matrices = [
    Matrix4.translate(0.5, 0.5, 0.5),
    Matrix4.scale(0.5, 0.5, 0.5),
    clipFromLight,
    lightFromWorld,
  ];
  textureFromWorld = matrices.reduce((accum, transform) => accum.multiplyMatrix(transform));
  initializeDepthProgram();
  depthTexture = reserveDepthTexture(depthWidth, depthHeight, gl.TEXTURE3);
  depthFramebuffer = initializeDepthFbo(depthTexture);
  terrainDepthVao = new VertexArray(depthProgram, attributes);
  renderDepths(depthWidth, depthHeight, depthFramebuffer);

  vao = new VertexArray(shaderProgram, attributes);
  await create_players();
  // Initialize kill counter UI elements
  killLeftEl = document.getElementById('kill-left-count');
  killRightEl = document.getElementById('kill-right-count');
  if (killLeftEl) killLeftEl.innerText = String(killCountLeft);
  if (killRightEl) killRightEl.innerText = String(killCountRight);
  
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



  //Draw skybox
  if(skyboxTexture) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.depthMask(false);
    skyboxProgram.bind();
    // ensure the skybox sampler uses texture unit 2
    skyboxProgram.setUniform1i('skybox', skyboxTextureUnit);
    const worldFromModel = Matrix4.translate(cameraRight.from.x, cameraRight.from.y, cameraRight.from.z);
    skyboxProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
    skyboxProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
    skyboxProgram.setUniformMatrix4fv('eyeFromWorld', cameraRight.eyeFromWorld.elements);
    skyboxVao.bind();
    skyboxVao.drawIndexed(gl.TRIANGLES);
    skyboxVao.unbind();
    skyboxProgram.unbind();
    gl.depthMask(true);
  }
  shaderProgram.bind();
  
  //lighting

  const lightPositionEye = cameraRight.eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform3f("specularColor", 0.0, 0.0, 0.0);
  //shaderProgram.setUniform1f("shininess", 0.0);
  shaderProgram.setUniform1f("ambientFactor", 0.1);

  // Terrain uses grassTexture (unit 1) and no model texture / vertex color
  shaderProgram.setUniform1i("grassTexture", grassTextureUnit);
  shaderProgram.setUniform1i("modelTexture", 0);
  shaderProgram.setUniform1i("useModelTexture", 0);
  shaderProgram.setUniform1i("useVertexColor", 0);
  if (grassTexture) {
    if (grassTexture instanceof WebGLTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, grassTexture);
    } else {
      console.warn('Expected grassTexture to be WebGLTexture but was:', grassTexture);
    }
  }
  if (depthTexture) {
    if (depthTexture instanceof WebGLTexture) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    } else {
      console.warn('Expected depthTexture to be WebGLTexture but was:', depthTexture);
    }
  }
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelRight.elements)
  shaderProgram.setUniform1i('animation', 0);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraRight.eyeFromWorld.elements)
  shaderProgram.setUniformMatrix4fv("textureFromWorld", textureFromWorld.elements);
  shaderProgram.setUniform1i("depthTexture", depthTextureUnit);

  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  if (modelInstances.length > 0) {
    for (const inst of modelInstances) {
      if (inst === cameraRightModel) continue; // don't draw right player's own snowman in right view
      shaderProgram.setUniformMatrix4fv('worldFromModel', inst.worldFromModel.elements);
      // Default: no animation
      shaderProgram.setUniform1i('animation', 0);
      // Upload joint transforms 
      if (inst.model && inst.model.skins && inst.model.skins.length > 0) {
        const joints = inst.model.skinTransforms(0, true);
        shaderProgram.setUniform1i('animation', 1);
        for (let i = 0; i < 64; i++) {
          const mat = i < joints.length ? joints[i] : Matrix4.identity();
          shaderProgram.setUniformMatrix4fv(`jointTransforms[${i}]`, mat.elements);
        }
      }
      if (inst.modelTexture) {
        if (inst.modelTexture instanceof WebGLTexture) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, inst.modelTexture);
          shaderProgram.setUniform1i('useModelTexture', 1);
          shaderProgram.setUniform1i('useVertexColor', 0);
          shaderProgram.setUniform1i('modelTexture', 1);
        } else {
          console.warn('Expected inst.modelTexture to be WebGLTexture but was:', inst.modelTexture);
          shaderProgram.setUniform1i('useModelTexture', 0);
          shaderProgram.setUniform1i('useVertexColor', inst.hasVertexColor ? 1 : 0);
        }
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
  
  // draw billboards
  if (plantVao && particleVao && billboardProgram) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    billboardProgram.bind();
    billboardProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
    billboardProgram.setUniformMatrix4fv('eyeFromWorld', cameraRight.eyeFromWorld.elements);
    billboardProgram.setUniformMatrix4fv('worldFromModel', Matrix4.identity().elements);

    // compute right/up in world space from camera.forward
    const f = cameraRight.forward.normalize();
    const right = f.cross(new Vector3(0, 1, 0)).normalize();
    const up = right.cross(f).normalize();
    billboardProgram.setUniform3f('cameraRight', right.x, right.y, right.z);
    billboardProgram.setUniform3f('cameraUp', up.x, up.y, up.z);

    if (particleTexture) {
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, particleTexture);
      billboardProgram.setUniform1i('billboardTexture', plantTextureUnit);
    }
    //draw plants
    plantVao.bind();
    plantVao.drawIndexed(gl.TRIANGLES);
    plantVao.unbind();

    // draw particles
    for (const p of particles) {
      if (p.owner !== cameraRight) continue;
      const worldFromModel = Matrix4.identity()
        .multiplyMatrix(Matrix4.translate(p.position.x, p.position.y, p.position.z))
        .multiplyMatrix(Matrix4.scale(0.05, 0.01, 0.05));
      billboardProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
       if (plantTexture) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, plantTexture);
        billboardProgram.setUniform1i('billboardTexture', particleTextureUnit);
      }
      particleVao.bind();
      particleVao.drawIndexed(gl.TRIANGLES);
      particleVao.unbind();
    }

    billboardProgram.unbind();

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
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
  //Draw skybox
  if(skyboxTexture) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.depthMask(false);
    skyboxProgram.bind();
    // ensure the skybox sampler uses texture unit 2
    skyboxProgram.setUniform1i('skybox', skyboxTextureUnit);
    const worldFromModel = Matrix4.translate(cameraLeft.from.x, cameraLeft.from.y, cameraLeft.from.z);
    skyboxProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
    skyboxProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
    skyboxProgram.setUniformMatrix4fv('eyeFromWorld', cameraLeft.eyeFromWorld.elements);
    skyboxVao.bind();
    skyboxVao.drawIndexed(gl.TRIANGLES);
    skyboxVao.unbind();
    skyboxProgram.unbind();
    gl.depthMask(true);
  }
  shaderProgram.bind();

  // Lighting
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 1.0, 1.0, 1.0);
  shaderProgram.setUniform3f("diffuseColor", 1.0, 1.0, 1.0);
  //shaderProgram.setUniform3f("specularColor", 0.0, 0.0, 0.0);
  //shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniform1f("ambientFactor", 0.1);

  //Does not use modelTexture or vertex color
  shaderProgram.setUniform1i("grassTexture", grassTextureUnit);
  shaderProgram.setUniform1i("modelTexture", 0);
  shaderProgram.setUniform1i("useModelTexture", 0);
  shaderProgram.setUniform1i("useVertexColor", 0);
  if (grassTexture) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, grassTexture);
  }
  if (depthTexture) {
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  }
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModelLeft.elements)
  shaderProgram.setUniform1i('animation', 0);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', cameraLeft.eyeFromWorld.elements);
  shaderProgram.setUniformMatrix4fv("textureFromWorld", textureFromWorld.elements);
  shaderProgram.setUniform1i("depthTexture", depthTextureUnit);
  
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  if (modelInstances.length > 0) {
    for (const inst of modelInstances) {
      if (inst === cameraLeftModel) continue; // don't draw left player's own snowman in left view
      shaderProgram.setUniformMatrix4fv('worldFromModel', inst.worldFromModel.elements);
      //Default: No animation
      shaderProgram.setUniform1i('animation', 0);
      //Upload animation
      if (inst.model && inst.model.skins && inst.model.skins.length > 0) {
        const joints = inst.model.skinTransforms(0, true);
        shaderProgram.setUniform1i('animation', 1);
        for (let i = 0; i < 64; i++) {
          const mat = i < joints.length ? joints[i] : Matrix4.identity();
          shaderProgram.setUniformMatrix4fv(`jointTransforms[${i}]`, mat.elements);
        }
      }
      
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

  // draw billboards
  if (plantVao && particleVao && billboardProgram) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    billboardProgram.bind();
    billboardProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
    billboardProgram.setUniformMatrix4fv('eyeFromWorld', cameraLeft.eyeFromWorld.elements);
    billboardProgram.setUniformMatrix4fv('worldFromModel', Matrix4.identity().elements);

    // compute right/up in world space from camera.forward
    const f = cameraLeft.forward.normalize();
    const right = f.cross(new Vector3(0, 1, 0)).normalize();
    const up = right.cross(f).normalize();
    billboardProgram.setUniform3f('cameraRight', right.x, right.y, right.z);
    billboardProgram.setUniform3f('cameraUp', up.x, up.y, up.z);

    if (plantTexture) {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, plantTexture);
      billboardProgram.setUniform1i('billboardTexture', plantTextureUnit);
    }

    plantVao.bind();
    plantVao.drawIndexed(gl.TRIANGLES);
    plantVao.unbind();

    // draw particles
    for (const p of particles) {
      if (p.owner !== cameraLeft) continue;
      const worldFromModel = Matrix4.identity()
        .multiplyMatrix(Matrix4.translate(p.position.x-0.2, p.position.y, p.position.z))
        .multiplyMatrix(Matrix4.scale(0.05, 0.01, 0.05));
      billboardProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
       if (plantTexture) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, plantTexture);
        billboardProgram.setUniform1i('billboardTexture', particleTextureUnit);
      }
      particleVao.bind();
      particleVao.drawIndexed(gl.TRIANGLES);
      particleVao.unbind();
    }

    billboardProgram.unbind();

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    billboardProgram.unbind();

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}

async function create_players() {
  // Read the glTF and wrap the first mesh in a SceneModel which builds its own VAO
  const model = await gltf.Model.readFromUrl('models/Snowman.gltf');
  const gun = await gltf.Model.readFromUrl('models/Gun.gltf')
  //Creates count random models
  modelInstances = [];
  
  //Create player characters
  if (cameraRight && cameraLeft && !cameraLeftModel && !cameraRightModel) {
    cameraRightModel = new SceneModel(model, shaderProgram, false, 20, heightmap, terrainScale);
    cameraRightGun = new SceneModel(gun, shaderProgram, false, 20, heightmap, terrainScale);
    cameraRightModel.animation('head');
    cameraRightModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraRight.from.x, cameraRight.from.y, cameraRight.from.z));
    cameraRightGun.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraRight.from.x + 1, cameraRight.from.y, cameraRight.from.z + 1)).multiplyMatrix(Matrix4.scale(0.25, 0.25, 0.25)).multiplyMatrix(Matrix4.rotateY(90));
    modelInstances.push(cameraRightModel);
    modelInstances.push(cameraRightGun);

    cameraLeftModel = new SceneModel(model, shaderProgram, false, 20, heightmap, terrainScale);
    cameraLeftGun = new SceneModel(gun, shaderProgram, false, 20, heightmap, terrainScale);
    cameraLeftModel.animation('head');
    cameraLeftModel.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraLeft.from.x, cameraLeft.from.y, cameraLeft.from.z));
    cameraLeftGun.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(cameraLeft.from.x + 1, cameraLeft.from.y, cameraLeft.from.z + 1)).multiplyMatrix(Matrix4.scale(0.25, 0.25, 0.25)).multiplyMatrix(Matrix4.rotateY(90));
    modelInstances.push(cameraLeftModel);
    modelInstances.push(cameraLeftGun);
  }

}

async function add_models(count: number) {
  // Read the glTF and wrap the first mesh in a SceneModel which builds its own VAO
  const model = await gltf.Model.readFromUrl('models/Zombie.gltf');
  // Temporary debug: print animations/skins/nodes to compare with Snowman.gltf
  console.log('Zombie model meshes:', model.meshes);
  console.log('Zombie model animations:', (model as any).animations);
  console.log('Zombie model skins:', (model as any).skins);
  console.log('Zombie model nodes count:', (model as any).nodes ? (model as any).nodes.length : 0);


  const model2 = await gltf.Model.readFromUrl('models/snowman.gltf');
  // Temporary debug: print animations/skins/nodes to compare with Snowman.gltf
  console.log('Snowman model meshes:', model2.meshes);
  console.log('Snowman model animations:', (model2 as any).animations);
  console.log('Snowman model skins:', (model2 as any).skins);
  console.log('Snowman model nodes count:', (model2 as any).nodes ? (model2 as any).nodes.length : 0);

  //Creates count random models
  for (let i = 0; i < count; ++i) {
    const inst = new SceneModel(model, shaderProgram, true, 20, heightmap, terrainScale);
    console.log(model.animations)
    console.log(inst.model)
    // Scale down zombies so they are a reasonable size compared to the Snowman.
    // Tweak this value if models still look too large/small.
    inst.setScale(0.02);
    // Expand the hitbox to account for bullet spray/particle spread.
    inst.setBBoxPadding(0.5);
    try {
      const wb = inst.getWorldBounds();
      console.log('Placed zombie bounds (after scale):', wb);
    } catch (e) {
      console.warn('Could not compute zombie bounds after scaling', e);
    }
    inst.animation('alec_Skeleton');
    modelInstances.push(inst);
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


function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  const deltaSeconds = elapsed / 1000; 
  const nowSec = (now as number) / 1000;

  // Advance animation time for all models (milliseconds elapsed)
  for (const inst of modelInstances) {
    if (inst.model && typeof inst.model.tick === 'function') {
      inst.model.tick(elapsed);
    }
  }

  //Update particles
  for (let i = particles.length - 1; i >= 0; --i) {
    const p = particles[i];
    p.life -= deltaSeconds;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.position = p.position.add(p.velocity.scalarMultiply(deltaSeconds));
    p.velocity = p.velocity.scalarMultiply(0.9);
  }

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

  // Update camera models so they follow their respective cameras.
  if (cameraRightModel && cameraRightGun && cameraRight) {
    cameraRight.reorient();
      const yawRight = Math.atan2(cameraRight.forward.z, cameraRight.forward.x) * 180 / Math.PI;
      cameraRightModel.worldFromModel = Matrix4.identity()
        .multiplyMatrix(Matrix4.translate(cameraRight.from.x, cameraRight.from.y - 3, cameraRight.from.z))
        .multiplyMatrix(Matrix4.rotateY(yawRight-90));
    cameraRightGun.worldFromModel = cameraRightModel.worldFromModel
        .multiplyMatrix(Matrix4.translate(-1, 2, 0))
        .multiplyMatrix(Matrix4.scale(0.25, 0.25, 0.25))
        .multiplyMatrix(Matrix4.rotateX(70))
        .multiplyMatrix(Matrix4.rotateY(-150))
        .multiplyMatrix(Matrix4.rotateZ(20));
  }
  if (cameraLeftModel && cameraLeftGun && cameraLeft) {
    cameraLeft.reorient();
      const yawLeft = Math.atan2(cameraLeft.forward.z, cameraLeft.forward.x) * 180 / Math.PI;
      cameraLeftModel.worldFromModel = Matrix4.identity()
        .multiplyMatrix(Matrix4.translate(cameraLeft.from.x, cameraLeft.from.y - 3, cameraLeft.from.z))
        .multiplyMatrix(Matrix4.rotateY(yawLeft-90));
    cameraLeftGun.worldFromModel = cameraLeftModel.worldFromModel
        .multiplyMatrix(Matrix4.translate(-1, 2, 0))
        .multiplyMatrix(Matrix4.scale(0.25, 0.25, 0.25))
        .multiplyMatrix(Matrix4.rotateX(70))
        .multiplyMatrix(Matrix4.rotateY(-150))
        .multiplyMatrix(Matrix4.rotateZ(20));
  }
  // Move zombies toward nearest camera
  for (const inst of modelInstances) {
    if (inst === cameraRightModel || inst === cameraLeftModel || inst === cameraLeftGun || inst == cameraRightGun) continue;
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
    // Face movement direction
    const yawDeg = Math.atan2(dir.z, dir.x) * 180 / Math.PI; // degrees
    inst.worldFromModel = Matrix4.identity()
      .multiplyMatrix(Matrix4.translate(inst.position.x, inst.position.y, inst.position.z))
      .multiplyMatrix(Matrix4.rotateY(yawDeg - 90))
      .multiplyMatrix(Matrix4.scale(inst.modelScale, inst.modelScale, inst.modelScale));
    // Check if enemy close enough to hit and if out of cooldown range
    if (dist < hitRadius) {
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
  // Spawn a new wave every after cooldown
    if (nowSec - lastRoundSec >= roundCooldown) {
      add_models(20);
      lastRoundSec = nowSec;
    }
  modelInstances = modelInstances.filter(inst => {
    if (inst.health <= 0) {
      inst.destroy();
      if (inst === cameraLeftModel) {
        cameraLeftModel = null;
        leftPlayerAlive = false;
        cameraLeftGun?.destroy();
        cameraLeftGun = null;
      }
      if (inst === cameraRightModel) {
        cameraRightModel = null;
        rightPlayerAlive = false;
        cameraRightGun?.destroy();
        cameraRightGun = null;
      }
      return false; // remove from array
    }
    return true;
  });
  renderDepths(depthWidth, depthHeight, depthFramebuffer);
  resizeCanvas();
  requestAnimationFrame(animate);
  then = now;
}


function animateGamepad(now: DOMHighResTimeStamp, deltaSeconds: number, turnSpeedDeg: number, moveSpeed: number) {
  const gamepads = navigator.getGamepads();
  const gamepadLeft = gamepads[0];
  const gamepadRight = gamepads[1];
  if (gamepadLeft && leftPlayerAlive) {
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
  if ( gamepadRight && rightPlayerAlive) {
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


function shoot(now:DOMHighResTimeStamp,camera: FirstPersonCamera) {
  const rayStart: Vector3 = camera.from.clone();
  const dir: Vector3 = camera.forward.normalize();
  const nowSec = (now as number) / 1000;

  if (camera === cameraLeft) {
    if (nowSec - lastShootLeftSec >= shootCooldown) {
      spawnMuzzleFlash(cameraLeft);
      for (const inst of modelInstances) {
        // Skip the player models and guns
        if (inst === cameraLeftModel || inst === cameraRightModel || inst == cameraLeftGun || inst == cameraRightGun) continue;
        const bounds = inst.getWorldBounds();
        const points = intersectRayBox(rayStart, dir, bounds.min, bounds.max);
        if (points.length > 0) {
          const before = inst.health;
          inst.takeDamage(1);
          console.log(inst.health);
          if (before > 0 && inst.health <= 0) {
            // left player scored the kill
            killCountLeft++;
            if (killLeftEl) killLeftEl.innerText = String(killCountLeft);
          }
        }
      }
      lastShootLeftSec = nowSec;
    }
  } 
  else if (camera === cameraRight) {
    if (nowSec - lastShootRightSec >= shootCooldown) {
      spawnMuzzleFlash(cameraRight);
      for (const inst of modelInstances) {
        // Skip the player models and guns
        if (inst === cameraLeftModel || inst === cameraRightModel || inst == cameraLeftGun || inst == cameraRightGun) continue;
        const bounds = inst.getWorldBounds();
        const points = intersectRayBox(rayStart, dir, bounds.min, bounds.max);
        if (points.length > 0) {
          const before = inst.health;
          inst.takeDamage(1);
          if (before > 0 && inst.health <= 0) {
            // right player scored the kill
            killCountRight++;
            if (killRightEl) killRightEl.innerText = String(killCountRight);
          }
        }
      }
      lastShootRightSec = nowSec;
    }
  }
}

//particle systems
function spawnMuzzleFlash(camera: FirstPersonCamera, count = particlesPerShot) {
  const basePos = camera.from.clone().add(new Vector3(camera.forward.x, 0, camera.forward.z).normalize().scalarMultiply(1.0));
  for (let i = 0; i < count; ++i) {
    const spread = 0.1;
    const rand = new Vector3((Math.random()-0.5)*spread, (Math.random()-0.5)*spread, (Math.random()-0.5)*spread);
    const dir = camera.forward.normalize().add(rand).normalize();
    const speed = 100 + Math.random() * 150;
    particles.push({
      position: basePos.clone(),
      velocity: dir.scalarMultiply(speed),
      scale: Math.random(),
      life: 0.08 + Math.random() * 0.12,
      owner: camera,
      color: new Vector4(1, 0.9, 0.6, 1),
    });
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

// Raycasting (for shooting)
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

// Skybox
async function loadCubemap(directoryUrl: string, extension: string, textureUnit: GLenum = gl.TEXTURE0) {
  const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

  const images = await Promise.all(faces.map(face => {
    const url = `${directoryUrl}/${face}.${extension}`;
    return fetchImage(url);
  }));

  gl.activeTexture(textureUnit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[5]);

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  return texture;
}

// Shadows
function reserveDepthTexture(width: number, height: number, unit: GLenum = gl.TEXTURE0) {
  gl.activeTexture(unit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}


function initializeDepthFbo(depthTexture: WebGLTexture | null) {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return framebuffer;
}


function initializeDepthProgram() {
  const vertexSource = `
uniform mat4 clipFromWorld;
uniform mat4 worldFromModel;
in vec3 position;

void main() {
  gl_Position = clipFromWorld * worldFromModel * vec4(position, 1.0);
}
  `;

  const fragmentSource = `
out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(1.0);
}
    `;

  depthProgram = new ShaderProgram(vertexSource, fragmentSource);
}


function renderDepths(width: number, height: number, fbo: WebGLFramebuffer | null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  gl.viewport(0, 0, width, height);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  const clipFromWorld = clipFromLight.multiplyMatrix(lightFromWorld);

  depthProgram.bind();
  if (terrainDepthVao) {
    depthProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld.elements);
    depthProgram.setUniformMatrix4fv('worldFromModel', Matrix4.identity().elements);
    terrainDepthVao.bind();
    terrainDepthVao.drawIndexed(gl.TRIANGLES);
    terrainDepthVao.unbind();
  }

  for (const inst of modelInstances) {
    depthProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld.elements);
    depthProgram.setUniformMatrix4fv('worldFromModel', inst.worldFromModel.elements);
    inst.vao.bind();
    inst.vao.drawIndexed(gl.TRIANGLES);
    inst.vao.unbind();
  }
  depthProgram.unbind();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function plants(n: number, terrainWidth: number, terrainDepth: number) {
  const positions: number[] = [];
  const texPositions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const x = Math.random() * terrainWidth;
    const z = Math.random() * terrainDepth;
    const y = heightmap.blerp(x/terrainScale.x,z/terrainScale.z) * terrainScale.y;

    positions.push(x, y, z);
    positions.push(x, y, z);
    positions.push(x, y, z);
    positions.push(x, y, z);


    texPositions.push(0, 1);
    texPositions.push(1, 1);
    texPositions.push(0, 0);
    texPositions.push(1,0);

    indices.push(i * 4, i * 4 + 1, i * 4 + 3);
    indices.push(i * 4, i * 4 + 3, i * 4 + 2);
  }

  // Create VAO
  const vertexCount = positions.length / 3;
  const attr = new VertexAttributes();
  attr.addAttribute('position', vertexCount, 3, new Float32Array(positions));
  attr.addAttribute('texPosition', texPositions.length / 2, 2, new Float32Array(texPositions));
  attr.addIndices(new Uint32Array(indices));

  return new VertexArray(billboardProgram, attr);
}


// Keyboard functions
function onMouseUp(_event: MouseEvent) {
  // Use the unified shoot() function so clicks respect cooldowns and apply damage.
  shoot(performance.now(), cameraRight);
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


window.addEventListener('load', () => initialize());
