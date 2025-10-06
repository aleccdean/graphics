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



  const box = await getVertex();
  box.computeNormals();
  const attributes = new VertexAttributes();
  attributes.addAttribute('position', box.vertexCount, 3, box.positionBuffer());
  attributes.addAttribute('normal', box.vertexCount, 3, box.normalBuffer());
  attributes.addIndices(box.faceBuffer());  
  

  const vertexSource = await fetchText('flat-vertex.glsl');
  const fragmentSource = await fetchText('flat-fragment.glsl');
  shaderProgram = new ShaderProgram(vertexSource, fragmentSource);

  vao = new VertexArray(shaderProgram, attributes)
  //Read in text file with fetch

  worldFromModel = Matrix4.identity();
  worldFromModel = worldFromModel.multiplyMatrix(Matrix4.scale(0.1,0.1, 0.1));
  getVertex();

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
  shaderProgram.setUniform3f('rgb', 1.0, 0.843, 0.0);
  

  
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
  const size = 1;
  const center = [0, 0];
  if (aspectRatio >= 1) {
    clipFromWorld = ortho(center[0] - size * aspectRatio, center[0] + size * aspectRatio, center[1] - size, center[1] + size, -1, 1);
  } else {
    clipFromWorld = ortho(center[0] - size, center[0] + size, center[1] - size / aspectRatio, center[1] + size / aspectRatio, -1, 1);
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


async function getVertex() {
  const objText = await fetchText('models/test.txt')
  const verts =[];
  const faces = [];
  const colors = [];

  for (let line of objText.split(/\r?\n/)) {
    const tri = line.split("   ");
    //Name variables x,y,z...
    //make vertices and faces buffer

    console.log(tri);
    verts.push(new Vector3( //1
      (parseFloat(tri[0].split(' ')[0])-parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])-parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])-parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //2
      (parseFloat(tri[0].split(' ')[0])+parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])-parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])-parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //3
      (parseFloat(tri[0].split(' ')[0])+parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])+parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])-parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //4
      (parseFloat(tri[0].split(' ')[0])-parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])+parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])-parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //5
      (parseFloat(tri[0].split(' ')[0])-parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])+parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])+parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //6
      (parseFloat(tri[0].split(' ')[0])-parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])-parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])+parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //7
      (parseFloat(tri[0].split(' ')[0])+parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])-parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])+parseFloat(tri[1].split(' ')[2])/2)
    ));
    verts.push(new Vector3( //8
      (parseFloat(tri[0].split(' ')[0])+parseFloat(tri[1].split(' ')[0])/2),
      (parseFloat(tri[0].split(' ')[1])+parseFloat(tri[1].split(' ')[1])/2),
      (parseFloat(tri[0].split(' ')[2])+parseFloat(tri[1].split(' ')[2])/2)
    ));
    faces.push([1, 2, 3]);
    faces.push([1, 3, 4]);

    faces.push([1, 5, 6]);
    faces.push([1, 4, 5]);

    faces.push([2, 3, 8]);
    faces.push([2, 7, 8]);

    faces.push([1, 2, 6]);
    faces.push([1, 6, 7]);
    
    faces.push([3, 4, 5]);
    faces.push([3, 5, 8]);

    faces.push([5, 6, 7]);
    faces.push([5, 7, 8]);
  }
  console.log(verts);
  return new Trimesh(verts, faces);

}

window.addEventListener('load', () => initialize());