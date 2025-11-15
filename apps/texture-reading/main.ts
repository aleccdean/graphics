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
  
  const unitCount = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  console.log(unitCount);


  const positions = new Float32Array([
    -1, -1, 0,
    1, -1, 0,
    -1, 1, 0,
    1, 1, 0
  ]);

  const texPositions = new Float32Array([
    0, 0, 
    1, 0,
    0, 1,
    1, 1,
  ]);


  const indices = new Uint32Array([
    0, 1, 2,
    1, 3, 2,
  ]);

  const attributes = new VertexAttributes();
  attributes.addAttribute('position', 4, 3, positions);
  attributes.addAttribute('texPosition', 4, 3, positions);
  attributes.addIndices(indices);

  loadTexture();

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
  //requestAnimationFrame(animate);
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

  shaderProgram.setUniform3f("lightPositionEye", lightPositionEye.x, lightPositionEye.y, lightPositionEye.z);
  shaderProgram.setUniform3f("albedo", 0.0, 0.0, 0.0);
  shaderProgram.setUniform3f("diffuseColor", 0.0, 0.0, 0.0);
  shaderProgram.setUniform1f("ambientFactor", 0.5);
  shaderProgram.setUniform3f("specularColor", 1.0, 1.0, 1.0);
  shaderProgram.setUniform1f("shininess", 1.0);

  shaderProgram.setUniformMatrix4fv('clipFromEye', clipFromEye.elements);
  shaderProgram.setUniformMatrix4fv('eyeFromWorld', eyeFromWorld.elements);
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
  shaderProgram.setUniform1i("xorTexture", 0);

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

function loadTexture() {
  const width = 256;
  const height = 256;
  const n = width * height * 4;
  const pixels = new Uint8ClampedArray(n);

  for(let r = 0; r < height; ++r) {
    for (let c = 0; c < width; ++c) {
      let i = (r * width +c) * 4;
      pixels[i + 0] = r ^ c;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }

   createRgbaTexture2d(width, height, pixels);
}

function generateRgbaImage(width: number, height: number) {
  const n = width * height * 4;
  const pixels = new Uint8ClampedArray(n);

  for (let r = 0; r < height; ++r) {
    for (let c = 0; c < width; ++c) {
      let i = (r * width + c) * 4;
      pixels[i + 0] = 255;
      pixels[i + 1] = 128;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }

  return pixels;
}

function generateGrayscaleImage(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height);
  for (let r = 0; r < height; ++r) {
    for (let c = 0; c < width; ++c) {
      let i = r * width + c;
      pixels[i] = 128;
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
/*
/*
createTexture2d(64, 64, grassImage, gl.TEXTURE0);
createTexture2d(128, 256, sandImage, gl.TEXTURE1);
createTexture2d(dirtImage.width, dirtImage.height, dirtImage, gl.TEXTURE2);
*/
let image: HTMLImageElement;

function powerOfTwoCeiling(x: number) {
  return Math.pow(2, Math.ceil(Math.log2(x)));
}

function padToPot(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to obtain 2D rendering context');
  }
  canvas.width = powerOfTwoCeiling(image.width);
  canvas.height = powerOfTwoCeiling(image.height);
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}


// noise reading
function createRedTexture3d(width: number, height: number, depth: number, texels: Uint8ClampedArray, textureUnit: GLenum = gl.TEXTURE0) {
  gl.activeTexture(textureUnit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, width, height, depth, 0, gl.RED, gl.UNSIGNED_BYTE, texels);
  return texture;
}

window.addEventListener('load', () => initialize());