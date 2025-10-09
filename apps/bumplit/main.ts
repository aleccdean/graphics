import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import { Gltf } from 'lib/static-gltf.js';
import { Vector3 } from 'lib/vector.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let eyeFromWorld: Matrix4;
let worldFromModel: Matrix4;
let clipFromEye: Matrix4;
let vao: VertexArray;
let lightPosition: Vector3;


async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  const model = await Gltf.readFromUrl('bumpy/bumpy.gltf');
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', model.meshes[0].positions.count, 3, model.meshes[0].positions.buffer);
  attributes.addAttribute('normal', model.meshes[0].normals!.count, 3, model.meshes[0].normals!.buffer);
  attributes.addIndices(new Uint32Array(model.meshes[0].indices!.buffer));

  vao = new VertexArray(shaderProgram, attributes);


  lightPosition = new Vector3(10.0, 2.0, -5.0);
  eyeFromWorld = Matrix4.identity();
  eyeFromWorld = eyeFromWorld.multiplyMatrix(Matrix4.translate(0, 0, -10));

  // Initialize the matrix ONCE
  worldFromModel = Matrix4.identity();

  // Set up event listeners BEFORE calling resizeCanvas
  window.addEventListener('resize', () => resizeCanvas());
  window.addEventListener('keydown', event => {
    if (event.key === 'w') {
      //lightPosition = lightPosition.add(new Vector3(0, 0, 10));
      lightPosition.z = lightPosition.z + 1;
      console.log(lightPosition);
      render();
    } else if (event.key === 's') {
      //lightPosition = lightPosition.add(new Vector3(0, 0, -10));
      lightPosition.z = lightPosition.z - 1;
      console.log(lightPosition);
      render();
    }
  });

  resizeCanvas();  
  requestAnimationFrame(animate);
}

function animate() {
  // You can update animation state here using the 'time' parameter if needed
  const t = performance.now()/1000;
  lightPosition = new Vector3(2.5 * Math.sin(2*t), 5 * Math.sin(t), lightPosition.z);
  render();
  requestAnimationFrame(animate);
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  
  const lightPositionEye = eyeFromWorld.multiplyPosition(lightPosition);
  shaderProgram.bind();
  /*
uniform float ambientFactor;
uniform vec3 specularColor;
uniform float shininess;
  */
  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 0.0, 0.0, 0.0);
  shaderProgram.setUniform3f("diffuseColor", 0.0, 0.0, 0.0);
  shaderProgram.setUniform1f("ambientFactor", 0.5);
  shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("shininess", 1.0);
  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
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
  clipFromEye = Matrix4.perspective(75, aspectRatio, 0.1, 15);

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