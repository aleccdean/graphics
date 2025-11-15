import { Matrix4 } from './matrix.js';
import { VertexArray } from './vertex-array.js';
import { VertexAttributes } from './vertex-attributes.js';
import { ShaderProgram } from './shader-program.js';
import * as gltf from './gltf.js';
import { Field2 } from './field.js';
import { Vector3 } from './vector.js';

/**
 * Class to store models and their attributes for ease of rendering many models.
 */
export class SceneModel {
    vao: VertexArray;
    worldFromModel: Matrix4;
    modelTexture: WebGLTexture | null = null;
    hasVertexColor: boolean = false;
    field: Field2;
    factors: Vector3;
    position: Vector3;
    health: number;
    private _mesh: gltf.Mesh; 


    constructor(mesh: gltf.Mesh, program: ShaderProgram, randomizePosition = true, range = 50, field: Field2, factors: Vector3, modelTexture?: WebGLTexture, health: number = 10) {
        this._mesh = mesh;
        this.field = field;
        this.factors = factors;
        this.health = health;
        const attributes = new VertexAttributes();
        attributes.addAttribute('position', mesh.positions.count, 3, mesh.positions.buffer as Float32Array);
        attributes.addAttribute('normal', mesh.normals!.count, 3, mesh.normals!.buffer as Float32Array);
        attributes.addIndices(new Uint32Array(mesh.indices!.buffer));
        if (mesh.colors) {
            attributes.addAttribute('color', mesh.colors.count, mesh.colors.componentCount || 3, mesh.colors.buffer as Float32Array);
            this.hasVertexColor = true;
        }
        if (mesh.texCoord) {
            attributes.addAttribute('texPosition', mesh.texCoord.count, mesh.texCoord.componentCount || 2, mesh.texCoord.buffer as Float32Array);
        }
        if (mesh.weights) {
            attributes.addAttribute('weights', mesh.weights.count, mesh.weights.componentCount || 4, mesh.weights.buffer as Float32Array);
        }
        if (mesh.joints) {
            attributes.addAttribute('joints', mesh.joints!.count, 4, new Float32Array(mesh.joints!.buffer));
        }

        // Store optional model texture and create the VAO
        this.modelTexture = modelTexture ?? null;
        this.vao = new VertexArray(program, attributes);

            // Build a randomized world-from-model translation matrix.
            if (randomizePosition) {
                let x: number, z: number, y = 0;

                if (field && factors) {
                    // Choose a random position across the terrain extents (in world coordinates)
                    const maxX = (field.width - 1) * factors.x;
                    const maxZ = (field.height - 1) * factors.z;
                    x = Math.random() * maxX;
                    z = Math.random() * maxZ;
                    // Convert back to sample coordinates for the heightfield
                    const sampleX = x / factors.x;
                    const sampleZ = z / factors.z;
                    const ynorm = field.blerp(sampleX, sampleZ);
                    y = ynorm * factors.y;
                } else {
                    x = (Math.random() * 2 - 1) * range;
                    z = (Math.random() * 2 - 1) * range;
                    y = 0;
                }

                this.worldFromModel = Matrix4.identity().multiplyMatrix(Matrix4.translate(x, y, z));

                console.log('SceneModel: placed at', { x, y, z });
            } else {
                this.worldFromModel = Matrix4.identity();
                console.log('SceneModel: no random placement — using identity transform');
            }
            this.position = this.getPosition();
    }
    
    destroy() { 
        this.vao.destroy();
    }

    /**
     * Returns the axis-aligned bounds in world space using current worldFromModel.
     * min = front-bottom-left (minX, minY, minZ)
     * max = back-top-right (maxX, maxY, maxZ)
     */
    getWorldBounds(): { min: Vector3; max: Vector3 } {
        const pos = this._mesh.positions.buffer;
        // Transform first vertex to seed
        let p = this.worldFromModel.multiplyPosition(new Vector3(pos[0], pos[1], pos[2]));
        let minX = p.x, minY = p.y, minZ = p.z;
        let maxX = p.x, maxY = p.y, maxZ = p.z;
        for (let i = 3; i < pos.length; i += 3) {
            p = this.worldFromModel.multiplyPosition(new Vector3(pos[i], pos[i + 1], pos[i + 2]));
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
        }
        return { min: new Vector3(minX, minY, minZ), max: new Vector3(maxX, maxY, maxZ) };
    }

    /** Get just the translation component (world position) */
    getPosition(): Vector3 {
        return new Vector3(
            this.worldFromModel.get(0,3),
            this.worldFromModel.get(1,3),
            this.worldFromModel.get(2,3)
        );
    }

    adjustY() {
        const x = this.position.x / this.factors.x;
        const z = this.position.z / this.factors.z;
        const height = this.field.blerp(x, z);
        const groundY = height * this.factors.y;
        this.position.y = groundY;
        this.worldFromModel = Matrix4.identity().multiplyMatrix(
            Matrix4.translate(this.position.x, this.position.y, this.position.z)
        );
    }

    keepInTerrain() {
        const maxX = (this.field.width - 1) * this.factors.x;
        const maxZ = (this.field.height - 1) * this.factors.z;
        if (this.position.x < 0) this.position.x = 0;
        else if (this.position.x > maxX) this.position.x = maxX;
        if (this.position.z < 0) this.position.z = 0;
        else if (this.position.z > maxZ) this.position.z = maxZ;
    }

    /** Set world transform to a pure translation at pos (discarding rotation/scale) */
    setPosition(pos: Vector3) {
        this.position.x = pos.x;
        this.position.z = pos.z;
        this.keepInTerrain();
        this.adjustY();
    }

    takeDamage(damage: number) {
        this.health = this.health - damage;
    }

}