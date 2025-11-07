import { Vector3 } from "./vector.js";

export class Trimesh {
    positions: Vector3[];
    faces: number[][];
    min!: Vector3;   // note the exclamation points!
    max!: Vector3;
    normals: Vector3[] | null;
    textures?: Vector3[];

    constructor(positions: Vector3[], faces: number[][], textures?: Vector3[]) {
      if(textures) {
        this.textures = textures;
        this.positions = positions;
        this.faces = faces;
        this.normals = null;
        this.computeMinMax();
      } else {
        this.positions = positions;
        this.faces = faces;
        this.normals = null;
        this.computeMinMax();
      }
    }

    get vertexCount() {
        return this.positions.length;
    }

    get faceCount() {
        return this.faces.length;
    }

    get textureCount() {
      return this.textures?.length;
    }

    computeMinMax() {
        // Guess the min and max to be the first position.
        this.min = this.positions[0].clone();
        this.max = this.positions[0].clone();
    
        // Try ousting the min and max.
        for (let position of this.positions) {
          if (position.x < this.min.x) {
            this.min.x = position.x;
          } else if (position.x > this.max.x) {
            this.max.x = position.x;
          }
    
          if (position.y < this.min.y) {
            this.min.y = position.y;
          } else if (position.y > this.max.y) {
            this.max.y = position.y;
          }
    
          if (position.z < this.min.z) {
            this.min.z = position.z;
          } else if (position.z > this.max.z) {
            this.max.z = position.z;
          }
        }
    }

    computeNormals() {
      const normals = this.positions.map(_ => new Vector3(0, 0, 0));

      for (let face of this.faces) {
        const positionA = this.positions[face[0]];
        const positionB = this.positions[face[1]];
        const positionC = this.positions[face[2]];
  
        const vectorAB = positionB.subtract(positionA);
        const vectorAC = positionC.subtract(positionA);
  
        const faceNormal = vectorAB.cross(vectorAC).normalize();

        normals[face[0]] = normals[face[0]].add(faceNormal);
        normals[face[1]] = normals[face[1]].add(faceNormal);
        normals[face[2]] = normals[face[2]].add(faceNormal);
      }
      this.normals = normals.map(normal => normal.normalize());
    }

    faceBuffer() {
        return new Uint32Array(this.faces.flat());
    }

    positionBuffer() {
        const xyzs = this.positions.flatMap(p => p.xyz);
        return new Float32Array(xyzs);
    }

    textureBuffer() { // Need to test, might not work
        const xyzs = this.textures!.flatMap(p => p.xyz);
        return new Float32Array(xyzs);
    }

    normalBuffer() {
      const xyzs = this.normals!.flatMap(p => p.xyz);
      return new Float32Array(xyzs);
    }


}


  
// Example usage:
/*
const balloon = new Trimesh(positions, faces);
const attributes = new VertexAttributes();
attributes.addAttribute('position', balloon.vertexCount, 3, balloon.positionBuffer());
attributes.addIndices(balloon.faceBuffer());
*/