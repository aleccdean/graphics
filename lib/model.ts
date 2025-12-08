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
    private vaoByProgram: Map<ShaderProgram, VertexArray>;
    worldFromModel: Matrix4;
    modelTexture: WebGLTexture | null = null;
    hasVertexColor: boolean = false;
    hasJoints: boolean = false;
    hasWeights: boolean = false;
    field: Field2;
    factors: Vector3;
    position: Vector3;
    health: number;
    mesh: gltf.Mesh; 
    model: gltf.Model;
    attributes: VertexAttributes;
    meshMinY: number = 0;
    modelScale: number = 2;
    /** Optional world-space padding to expand the computed AABB (in world units) */
    bboxPadding: number = 0;


    constructor(model: gltf.Model, program: ShaderProgram, randomizePosition = true, range = 50, field: Field2, factors: Vector3, modelTexture?: WebGLTexture, health: number = 10) {
        this.model = model;
        this.mesh = model.meshes[0];
        // Compute mesh min Y so we can align the model's base to the terrain
        try {
            const posBuf = this.mesh.positions.buffer;
            let minY = Infinity;
            for (let i = 1; i < posBuf.length; i += 3) {
                if (posBuf[i] < minY) minY = posBuf[i];
            }
            if (!isFinite(minY)) minY = 0;
            this.meshMinY = minY;
        } catch (e) {
            this.meshMinY = 0;
        }
        this.field = field;
        this.factors = factors;
        this.health = health;
        this.attributes = new VertexAttributes();
        this.attributes.addAttribute('position', this.mesh.positions.count, 3, this.mesh.positions.buffer as Float32Array);
        this.attributes.addAttribute('normal', this.mesh.normals!.count, 3, this.mesh.normals!.buffer as Float32Array);
        this.attributes.addIndices(new Uint32Array(this.mesh.indices!.buffer));
        if (this.mesh.colors) {
            this.attributes.addAttribute('color', this.mesh.colors.count, this.mesh.colors.componentCount || 3, this.mesh.colors.buffer as Float32Array);
            this.hasVertexColor = true;
        }
        if (this.mesh.texCoord) {
            this.attributes.addAttribute('texPosition', this.mesh.texCoord.count, this.mesh.texCoord.componentCount || 2, this.mesh.texCoord.buffer as Float32Array);
        }
        if (this.mesh.weights) {
            this.attributes.addAttribute('weights', this.mesh.weights.count, this.mesh.weights.componentCount || 4, this.mesh.weights.buffer as Float32Array);
            this.hasWeights = true;
        }
        if (this.mesh.joints) {
            this.attributes.addAttribute('joints', this.mesh.joints!.count, 4, new Float32Array(this.mesh.joints!.buffer));
            this.hasJoints = true;
        }

        // Store optional model texture and create the VAO
        this.modelTexture = modelTexture ?? null;
        this.vaoByProgram = new Map();
        this.vao = this.getVao(program);

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

                // Keep this.position as the ground contact point (y = terrain height)
                this.position = new Vector3(x, y, z);
                // Translate the model so its lowest vertex (meshMinY) sits at 'y'
                this.worldFromModel = Matrix4.identity()
                    .multiplyMatrix(Matrix4.translate(x, y - this.meshMinY * this.modelScale, z))
                    .multiplyMatrix(Matrix4.scale(this.modelScale, this.modelScale, this.modelScale));

                console.log('SceneModel: placed at', { x, y, z, meshMinY: this.meshMinY });
                try {
                    const wb = this.getWorldBounds();
                    console.log('SceneModel world-space bounds after placement:', { worldMinY: wb.min.y, worldMaxY: wb.max.y });
                } catch (e) {
                    console.warn('Failed to compute world bounds for debug', e);
                }
            } else {
                // No random placement: place model so its base sits at world y=0
                this.position = new Vector3(0, 0, 0);
                this.worldFromModel = Matrix4.identity()
                    .multiplyMatrix(Matrix4.translate(0, -this.meshMinY * this.modelScale, 0))
                    .multiplyMatrix(Matrix4.scale(this.modelScale, this.modelScale, this.modelScale));
                console.log('SceneModel: no random placement — aligning base to y=0, meshMinY=', this.meshMinY);
                try {
                    const wb = this.getWorldBounds();
                    console.log('SceneModel world-space bounds (no-random):', { worldMinY: wb.min.y, worldMaxY: wb.max.y });
                } catch (e) {
                    console.warn('Failed to compute world bounds for debug', e);
                }
            }
            // Ensure this.position is set (getPosition will now prefer stored position)
            if (!this.position) this.position = this.getPosition();
    }
    
    destroy() { 
        for (const vao of this.vaoByProgram.values()) {
            vao.destroy();
        }
        this.vaoByProgram.clear();
        this.attributes.destroy();
    }

    /**
     * Returns the axis-aligned bounds in world space using current worldFromModel.
     * min = front-bottom-left (minX, minY, minZ)
     * max = back-top-right (maxX, maxY, maxZ)
     */
    getWorldBounds(): { min: Vector3; max: Vector3 } {
        const pos = this.mesh.positions.buffer;
            // compute animated vertex positions using joint transforms
            // so animated vertices are included in the bounds. Otherwise transform vertices
            // by the worldFromModel matrix.
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            const vertexCount = pos.length / 3;

            const hasSkin = this.model && this.model.skins && this.model.skins.length > 0 && this.mesh.joints && this.mesh.weights;
            let jointTransforms: Matrix4[] = [];
            if (hasSkin) {
                try {
                    jointTransforms = this.model.skinTransforms(0, true);
                } catch (e) {
                    jointTransforms = [];
                }
            }

            const jointsBuf: any = this.mesh.joints ? this.mesh.joints.buffer : null;
            const weightsBuf: any = this.mesh.weights ? this.mesh.weights.buffer : null;

            for (let vi = 0; vi < vertexCount; ++vi) {
                const vx = pos[vi * 3 + 0];
                const vy = pos[vi * 3 + 1];
                const vz = pos[vi * 3 + 2];
                let worldP: Vector3;

                if (hasSkin && jointsBuf && weightsBuf) {
                    // build poseFromModel = sum_k weight_k * jointTransform[j_k]
                    const j0 = jointsBuf[vi * 4 + 0] | 0;
                    const j1 = jointsBuf[vi * 4 + 1] | 0;
                    const j2 = jointsBuf[vi * 4 + 2] | 0;
                    const j3 = jointsBuf[vi * 4 + 3] | 0;
                    const w0 = weightsBuf[vi * 4 + 0] || 0;
                    const w1 = weightsBuf[vi * 4 + 1] || 0;
                    const w2 = weightsBuf[vi * 4 + 2] || 0;
                    const w3 = weightsBuf[vi * 4 + 3] || 0;

                    const pose = new Matrix4();
                    // zero-initialize
                    for (let e = 0; e < 16; ++e) pose.elements[e] = 0;

                    const addWeighted = (jtIndex: number, weight: number) => {
                        if (!isFinite(weight) || weight === 0) return;
                        const jt = jointTransforms[jtIndex] || Matrix4.identity();
                        for (let e = 0; e < 16; ++e) {
                            pose.elements[e] += jt.elements[e] * weight;
                        }
                    };

                    addWeighted(j0, w0);
                    addWeighted(j1, w1);
                    addWeighted(j2, w2);
                    addWeighted(j3, w3);

                    // transform local vertex by pose then by worldFromModel
                    const localP = pose.multiplyPosition(new Vector3(vx, vy, vz));
                    worldP = this.worldFromModel.multiplyPosition(localP);
                } else {
                    worldP = this.worldFromModel.multiplyPosition(new Vector3(vx, vy, vz));
                }

                if (worldP.x < minX) minX = worldP.x; if (worldP.x > maxX) maxX = worldP.x;
                if (worldP.y < minY) minY = worldP.y; if (worldP.y > maxY) maxY = worldP.y;
                if (worldP.z < minZ) minZ = worldP.z; if (worldP.z > maxZ) maxZ = worldP.z;
            }
            // Expand bounds by optional padding in world space
            if (this.bboxPadding && isFinite(this.bboxPadding) && this.bboxPadding > 0) {
                minX -= this.bboxPadding;
                minY -= this.bboxPadding;
                minZ -= this.bboxPadding;
                maxX += this.bboxPadding;
                maxY += this.bboxPadding;
                maxZ += this.bboxPadding;
            }

            return { min: new Vector3(minX, minY, minZ), max: new Vector3(maxX, maxY, maxZ) };
    }

        /** Set world-space bounding-box padding (in world units) */
        setBBoxPadding(p: number) {
            if (!isFinite(p) || p < 0) return;
            this.bboxPadding = p;
        }

    /** Get just the translation component (world position) */
    getPosition(): Vector3 {
        // Prefer explicit stored position (which represents the ground contact point)
        if (this.position) return this.position;
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
        // Keep mesh base aligned: translate by (groundY - meshMinY)
        this.worldFromModel = Matrix4.identity()
            .multiplyMatrix(Matrix4.translate(this.position.x, this.position.y - this.meshMinY * this.modelScale, this.position.z))
            .multiplyMatrix(Matrix4.scale(this.modelScale, this.modelScale, this.modelScale));
    }

    /** Set a uniform scale for this instance and rebuild world transform to preserve base alignment. */
    setScale(s: number) {
        if (!isFinite(s) || s <= 0) return;
        this.modelScale = s;
        // Rebuild worldFromModel to keep the base (meshMinY) sitting on the stored position.y
        if (this.position) {
            this.worldFromModel = Matrix4.identity()
                .multiplyMatrix(Matrix4.translate(this.position.x, this.position.y - this.meshMinY * this.modelScale, this.position.z))
                .multiplyMatrix(Matrix4.scale(this.modelScale, this.modelScale, this.modelScale));
        }
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

    animation(animation: string) {
        this.model.play(animation);
    }

    getVao(program: ShaderProgram): VertexArray {
        let vao = this.vaoByProgram.get(program);
        if (!vao) {
            vao = new VertexArray(program, this.attributes);
            this.vaoByProgram.set(program, vao);
        }
        return vao;
    }

}