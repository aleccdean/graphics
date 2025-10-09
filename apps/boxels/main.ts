import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import { Prefab } from 'lib/prefab.js';
import { Vector3 } from 'lib/vector.js';
import { Trimesh } from 'lib/trimesh.js';
let canvas: HTMLCanvasElement;
let shaderProgram: ShaderProgram;
let clipFromWorld: Float32Array;
let worldFromModel: Matrix4;
let vao: VertexArray;
let radians: number = 0;

async function initialize() {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  window.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;



  const { faces, verts, colors } = await getVertex();
  //box.computeNormals();
  const attributes = new VertexAttributes();
  console.log(verts);
  console.log(faces);
  console.log(Float32Array.from(verts));
  attributes.addAttribute('position', verts.length/3, 3, verts);
  attributes.addAttribute('color', colors.length/3, 3, colors);
  attributes.addIndices(faces);  
  console.log(attributes);
  

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  vao = new VertexArray(shaderProgram, attributes)
  //Read in text file with fetch

  worldFromModel = Matrix4.identity();
  //worldFromModel = worldFromModel.multiplyMatrix(Matrix4.scale(0.1,0.1, 0.1));
  

  // Event listeners
  window.addEventListener('resize', () => resizeCanvas());

  window.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateZ(-10));
        render();
      } else if (event.key === 'ArrowRight') {
        worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateZ(10));
        render();
      } else if (event.key === 'ArrowUp') {
        worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateX(10));
        render();
      } else if (event.key === 'ArrowDown') {
        worldFromModel = worldFromModel.multiplyMatrix(Matrix4.rotateX(-10));
        render();
      }
    });

  resizeCanvas();  
}

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.392, 0.584, 0.929, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);


  shaderProgram.bind();
  shaderProgram.setUniformMatrix4fv('clipFromWorld', clipFromWorld);
  

  
  shaderProgram.setUniformMatrix4fv('worldFromModel', worldFromModel.elements);
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
  const size = 10;
  const center = [0, 0, 0];
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


async function getVertex(): Promise<{ faces: Uint32Array, verts: Float32Array, colors: Float32Array }> {
  const objText = await fetchText('models/truck.txt')
  const verts =[];
  const faces = [];
  const colors = [];

  for (let line of objText.split(/\r?\n/)) {
    const tri = line.split("   ");
    //Name variables x,y,z...
    //make vertices and faces buffer
    const x = parseFloat(tri[0].split(' ')[0]);
    const y = parseFloat(tri[0].split(' ')[1]);
    const z = parseFloat(tri[0].split(' ')[2]);
    const w = parseFloat(tri[1].split(' ')[0]);
    const h = parseFloat(tri[1].split(' ')[1]);
    const d = parseFloat(tri[1].split(' ')[2]);
    const r = parseFloat(tri[2].split(' ')[0]);
    const g = parseFloat(tri[2].split(' ')[1]);
    const b = parseFloat(tri[2].split(' ')[2]);

    const base = verts.length / 3;


    for (let i = 0; i < 8; i++) colors.push(r, g, b);


    verts.push(
      x - w/2, y - h/2, z - d/2, // 0
      x + w/2, y - h/2, z - d/2, // 1
      x + w/2, y + h/2, z - d/2, // 2
      x - w/2, y + h/2, z - d/2, // 3
      x - w/2, y + h/2, z + d/2, // 4
      x - w/2, y - h/2, z + d/2, // 5
      x + w/2, y - h/2, z + d/2, // 6
      x + w/2, y + h/2, z + d/2  // 7
    );

    // Triangles (counter‑clockwise when viewed from outside)
    // Back
    faces.push(base+0, base+2, base+1,  base+0, base+3, base+2);
    // Left
    faces.push(base+0, base+4, base+3,  base+0, base+5, base+4);
    // Right
    faces.push(base+1, base+7, base+2,  base+1, base+6, base+7);
    // Bottom
    faces.push(base+0, base+6, base+1,  base+0, base+5, base+6);
    // Top
    faces.push(base+3, base+4, base+7,  base+3, base+7, base+2);
    // Front
    faces.push(base+4, base+6, base+5,  base+4, base+7, base+6);
  }
  console.log(verts);
  //return new Trimesh(verts, faces);
  return {
    faces: Uint32Array.from(faces),
    verts: Float32Array.from(verts),
    colors: Float32Array.from(colors)
  };

}

window.addEventListener('load', () => initialize());