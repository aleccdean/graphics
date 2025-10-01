import { lerp } from 'lib/math-utilities.js';
export class Vector3 {
    xyz: number[];

    constructor(x: number, y: number, z: number) {
        this.xyz = [x, y, z];
    }

    get x() {
        return this.xyz[0]
    }

    get y() {
        return this.xyz[1]
    }

    get z() {
        return this.xyz[2]
    }

    set x(value: number) {
        this.xyz[0] = value;
    }

    set y(value: number) {
        this.xyz[1] = value;
    }

    set z(value: number) {
        this.xyz[2] = value;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    get magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    }

    toString() {
        return `[${this.x}, ${this.y}, ${this.z}]`;
    }

    add(that: Vector3) {
        return new Vector3(this.x + that.x, this.y + that.y, this.z + that.z);
    }

    subtract(that: Vector3) {
        return new Vector3(this.x - that.x, this.y - that.y, this.z - that.z);
    }

    scalarMultiply(factor: number) {
        return new Vector3(this.x * factor, this.y * factor, this.z * factor);
    }

    normalize() {
        return new Vector3(this.x / this.magnitude, this.y / this.magnitude, this.z / this.magnitude);
    }

    cross(that: Vector3) {
        return new Vector3(
            this.y * that.z - this.z * that.y,
            this.z * that.x - this.x * that.z,
            this.x * that.y - this.y * that.x
        );
    }
    /*
    You do need a Vector3.lerp that accepts two parameters: a that vector and a blend parameter.
     It creates a new vector with lerped x-, y-, and z-coordinates. Use your scalar lerp method to do the work.
    */
    lerp(that: Vector3, blend: number) {
        return new Vector3(
            lerp(this.x, that.x, blend),
            lerp(this.y, that.y, blend),
            lerp(this.z, that.z, blend),
        );

    }
}