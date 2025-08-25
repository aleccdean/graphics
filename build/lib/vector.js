export class Vector3 {
    constructor(x, y, z) {
        this.xyz = [x, y, z];
    }
    get x() {
        return this.xyz[0];
    }
    get y() {
        return this.xyz[1];
    }
    get z() {
        return this.xyz[2];
    }
    set x(value) {
        this.xyz[0] = value;
    }
    set y(value) {
        this.xyz[1] = value;
    }
    set z(value) {
        this.xyz[2] = value;
    }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    get magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    toString() {
        return `[${this.x}, ${this.y}, ${this.z}]`;
    }
    add(that) {
        return new Vector3(this.x + that.x, this.y + that.y, this.z + that.z);
    }
    scalarMultiply(factor) {
        return new Vector3(this.x * factor, this.y * factor, this.z * factor);
    }
    normalize() {
        return new Vector3(this.x / this.magnitude, this.y / this.magnitude, this.z / this.magnitude);
    }
}
