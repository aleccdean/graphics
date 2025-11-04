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

  // Narrow the union so we call the correct texImage2D overload:
  // - If image is an HTMLImageElement (TexImageSource), use the signature that takes a source.
  // - If image is a Uint8ClampedArray, use the ArrayBufferView signature with explicit width/height.
  if (image instanceof HTMLImageElement) {
    // texImage2D(target, level, internalformat, format, type, source)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else {
    // image is Uint8ClampedArray -> ArrayBufferView overload
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // If you actually want a single-channel grayscale texture, replace the line above with the LUMINANCE call below
    // (or provide a separate function). Left commented to avoid double-uploading incompatible formats.
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, image); // FOR GRAYSCALE
  }

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

window.addEventListener('load', () => initialize());