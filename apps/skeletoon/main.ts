import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import * as gltf from 'lib/gltf.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let eyeFromWorld: Matrix4;
let worldFromModel: Matrix4;
let clipFromEye: Matrix4;
let vao: VertexArray;
let lightPosition: Vector3;
let model: gltf.Model;
let currentClipIndex: number;


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
  if (model.meshes[0].colors) {
    attributes.addAttribute('color', model.meshes[0].colors.count, 3, model.meshes[0].colors.buffer);
  }
  attributes.addIndices(new Uint32Array(model.meshes[0].indices!.buffer));

  vao = new VertexArray(shaderProgram, attributes);

  console.log(Object.keys(model.animations).length);
  const clipNames = Object.keys(model.animations);
  currentClipIndex = 0;
  for (let clip of Object.keys(model.animations)) {
    console.log(clip);
  }
  //model.play('ArmatureAction');
  


  lightPosition = new Vector3(10.0, 2.0, -5.0);
  eyeFromWorld = Matrix4.identity();
  eyeFromWorld = eyeFromWorld.multiplyMatrix(Matrix4.translate(0, 0, -10));

  // Initialize the matrix ONCE
  worldFromModel = Matrix4.identity();
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.scale(0.5, 0.5, 1));
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.translate(0, -10, 0));
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(90));

  // Set up event listeners BEFORE calling resizeCanvas
  window.addEventListener('resize', () => resizeCanvas());
  window.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
          worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(-10));
          render();
        } else if (event.key === 'ArrowRight') {
          worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(10));
          render();
        } else if (event.key === 'ArrowUp') {
          worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateZ(10));
          render();
        } else if (event.key === 'ArrowDown') {
          worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateZ(-10));
          render();
        } else if (event.key == ' ') {
          //Switch animation
          currentClipIndex = (currentClipIndex + 1) % clipNames.length;
          model.play(clipNames[currentClipIndex]);
          console.log('Switched to:', clipNames[currentClipIndex]);
          render();
        }
      });

  resizeCanvas();  
  requestAnimationFrame(animate);
}

let then: DOMHighResTimeStamp | null = null;

function animate(now: DOMHighResTimeStamp) {
  const elapsed = then ? now - then : 0;
  model.tick(elapsed);
  render();
  requestAnimationFrame(animate);
  then = now;
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  
  const lightPositionEye = eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 0.0, 0.0, 0.0);
  shaderProgram.setUniform3f("diffuseColor", 0.0, 0.0, 0.0);
  shaderProgram.setUniform1f("ambientFactor", 0.5);
  shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);

  for (let [i, matrix] of model.skinTransforms(300).entries()) {
    shaderProgram.setUniformMatrix4fv(`jointTransforms[${i}]`, matrix.elements);
  }
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
  clipFromEye = Matrix4.perspective(75, aspectRatio, 0.1, 30);

  render();
}

window.addEventListener('load', () => initialize());