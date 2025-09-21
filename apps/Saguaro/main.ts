import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import { Gltf } from 'lib/static-gltf.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromWorld: Float32Array;
let worldFromModel: Matrix4;
let worldFromModel2: Matrix4;
let worldFromModel3: Matrix4;
let vao: VertexArray;
let vao2: VertexArray;
let vao3: VertexArray;


async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;



  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  const model = await Gltf.readFromUrl('blender/Saguaro.gltf');
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', model.meshes[0].positions.count, 3, model.meshes[0].positions.buffer);
  attributes.addAttribute('normal', model.meshes[0].normals!.count, 3, model.meshes[0].normals!.buffer);
  //attributes.addAttribute('color', model.meshes[0].colors!.count, 3, model.meshes[0].colors!.buffer);
  attributes.addIndices(new Uint32Array(model.meshes[0].indices!.buffer));

  vao = new VertexArray(shaderProgram, attributes);
  vao2 = new VertexArray(shaderProgram, attributes);
  vao3 = new VertexArray(shaderProgram, attributes);
  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  worldFromModel = Matrix4.identity();
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.scale(0.5, 0.5, 1));
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.translate(0, 0, 0));
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(90));

  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(-10));
      render();
    }
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
      worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateY(10));
      render();
    }
  });

  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);


  shaderProgram.bind();
  
  worldFromModel2 = worldFromModel;
  worldFromModel2 = worldFromModel2.multiplyMatrix(Matrix4.translate(0, 8, -5.1));
  worldFromModel2 = worldFromModel2.multiplyMatrix(Matrix4.scale(1, 0.5, 0.5));
  shaderProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel2.elements);
  vao2.bind();
  vao2.drawIndexed(gl.TRIANGLES);
  vao2.unbind();

  worldFromModel3 = worldFromModel;
  worldFromModel3 = worldFromModel3.multiplyMatrix(Matrix4.translate(0, 5.5, 4.5));
  worldFromModel3 = worldFromModel3.multiplyMatrix(Matrix4.scale(1, 0.25, 0.25));
  shaderProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel3.elements);
  vao2.bind();
  vao2.drawIndexed(gl.TRIANGLES);
  vao2.unbind();
  
  shaderProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld);
  //shaderProgram.setUniform3f('rgb', 1.0, 0.843, 0.0);
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.scale(1, 1, 1));
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.translate(0,0, 0));
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
  //shaderProgram.setUniform3f('rgb', 1.0, 0.843, 0.0);
  // filled
  vao.bind();
  vao.drawIndexed(gl.TRIANGLES);
  vao.unbind();
  

  shaderProgram.unbind();
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;
  const size = 7;
  const center = [0, 0];
  if (aspectRatio >= 1) {
    clipFromWorld = ortho(center[0] - size * aspectRatio, center[0] + size * aspectRatio, center[1] - size, center[1] + size, -10, 10);
  } else {
    clipFromWorld = ortho(center[0] - size, center[0] + size, center[1] - size / aspectRatio, center[1] + size / aspectRatio, -10, 10);
  }
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