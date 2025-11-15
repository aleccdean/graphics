import { Field2 } from "./field.js";
import { Matrix4 } from "./matrix.js";
import { Vector3 } from "./vector.js";

export class FirstPersonCamera {
    from: Vector3;
    worldUp: Vector3;
    forward: Vector3;
    right!: Vector3;
    eyeFromWorld!: Matrix4;
    field: Field2;
    offset: number;
    factors: Vector3;
    private verticalVelocity: number = 0; 
    private isOnGround: boolean = true; 
    gravity: number = -30.0; //Affects fall speed
    jumpSpeed: number = 10.0; //Affects height of jump

    constructor(from: Vector3, to: Vector3, field: Field2, offset: number, factors: Vector3) {
        this.forward = to.subtract(from).normalize();
        this.from = from;
        this.worldUp = new Vector3(0, 1, 0);
        this.field = field;
        this.offset = offset;
        this.factors = factors;
        this.adjustY(); // set starting Y to ground + offset
        this.reorient();
    }

    reorient() {
        this.eyeFromWorld = Matrix4.look(this.from, this.forward, this.worldUp);
        this.right = new Vector3(
            this.eyeFromWorld.get(0, 0),
            this.eyeFromWorld.get(0, 1),
            this.eyeFromWorld.get(0, 2)
        );
    }  

    keepInTerrain() {
        const maxX = (this.field.width - 1) * this.factors.x;
        const maxZ = (this.field.height - 1) * this.factors.z;
        if (this.from.x < 0) this.from.x = 0;
        else if (this.from.x > maxX) this.from.x = maxX;
        if (this.from.z < 0) this.from.z = 0;
        else if (this.from.z > maxZ) this.from.z = maxZ;
    }

    adjustY() {
        const x = this.from.x / this.factors.x;
        const z = this.from.z / this.factors.z;
        const height = this.field.blerp(x, z);
        const groundY = height * this.factors.y + this.offset;
        if (this.isOnGround) {
            this.from.y = groundY;
            this.verticalVelocity = 0;
        } else {
            // while airborne do not override this.from.y
        }
    }

    // Render jumping smoothly(called repeatedly in animate)
    update(deltaSeconds: number) {
        if (!this.isOnGround) {
            this.verticalVelocity += this.gravity * deltaSeconds;
            this.from = this.from.add(new Vector3(0, this.verticalVelocity * deltaSeconds, 0));
            this.keepInTerrain();
            const x = this.from.x / this.factors.x;
            const z = this.from.z / this.factors.z;
            const height = this.field.blerp(x, z);
            const groundY = height * this.factors.y + this.offset;
            if (this.from.y <= groundY) { //If on ground
                this.from.y = groundY;
                this.verticalVelocity = 0;
                this.isOnGround = true;
            }
            this.reorient();
        } else {
            this.keepInTerrain();
            this.adjustY();
            this.reorient();
        }
    }


    jump() {
        if (this.isOnGround) {
            this.verticalVelocity = this.jumpSpeed;
            this.isOnGround = false;
        }
    }


    strafe(distance: number) {
        this.from = this.from.add(this.right.scalarMultiply(distance));
        this.keepInTerrain();
        this.adjustY();
        this.reorient();
    }

    advance(distance: number) {
        this.from = this.from.add(this.forward.scalarMultiply(distance));
        this.keepInTerrain();
        this.adjustY();
        this.reorient();
    }

    yaw(degrees: number) {
        const rotation = Matrix4.rotateAround(this.worldUp, degrees);
        this.forward = rotation.multiplyPosition(this.forward);
        this.reorient();
    }

    pitch(degrees: number) {
        const rotation = Matrix4.rotateAround(this.right, degrees);
        this.forward = rotation.multiplyPosition(this.forward);
        this.reorient();
    }



}
