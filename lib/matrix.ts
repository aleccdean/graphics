export class Matrix4 {
  elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
  }

  get(r: number, c: number) {
    return this.elements[r + c*4];
  }

  set(r: number, c: number, value: number) {
    this.elements[r + c*4] = value;
  }
      
  static identity() {
    const m = new Matrix4();
    m.set(0, 0, 1);
    m.set(1, 1, 1);
    m.set(2, 2, 1);
    m.set(3, 3, 1);
    return m;
  }

  static scale(factorX: number, factorY: number, factorZ: number) {
    const m = Matrix4.identity();
    m.set(0, 0, factorX);
    m.set(1, 1, factorY);
    m.set(2, 2, factorZ);
    return m;
  }

  static translate(offsetX: number, offsetY: number, offsetZ: number) {
    const m = Matrix4.identity();
    m.set(0, 3, offsetX);
    m.set(1, 3, offsetY);
    m.set(2, 3, offsetZ);
    return m;
  }


  static rotateZ(degrees: number) {
    const radians = degrees * Math.PI / 180;
    const m = Matrix4.identity();
    m.set(0, 0, Math.cos(radians));
    m.set(0, 1, -Math.sin(radians));
    m.set(1, 0, Math.sin(radians));
    m.set(1, 1, Math.cos(radians));
    return m;
  }

  static rotateX(degrees: number) {
    const radians = degrees * Math.PI / 180;
    const m = Matrix4.identity();
    m.set(1, 1, Math.cos(radians));
    m.set(1, 2, -Math.sin(radians));
    m.set(2, 1, Math.sin(radians));
    m.set(2, 2, Math.cos(radians));
    return m;
  }

  static rotateY(degrees: number) {
    const radians = degrees * Math.PI / 180;
    const m = Matrix4.identity();
    m.set(0, 0, Math.cos(radians));
    m.set(0, 2, -Math.sin(radians));
    m.set(2, 0, Math.sin(radians));
    m.set(2, 2, Math.cos(radians));
    return m;
  }

  multiplyMatrix(that: Matrix4) {
    const m = new Matrix4();

    for (let r = 0; r < 4; ++r) {
      for (let c = 0; c < 4; ++c) {
        const dot = 
          this.get(r, 0) * that.get(0, c) +
          this.get(r, 1) * that.get(1, c) +
          this.get(r, 2) * that.get(2, c) +
          this.get(r, 3) * that.get(3, c);
        m.set(r, c, dot);
      }
    }

    return m;
  }

  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    const m = Matrix4.identity();
    const width = right - left;
    const height = top - bottom;
    const depth = far - near;
    m.set(0, 0, 2/width);
    m.set(0, 3, -(right+left)/width);
    m.set(1, 1, 2/height);
    m.set(1, 3, -(top+bottom)/height);
    m.set(2, 2, 2/-depth);
    m.set(2, 3, -(near+far)/depth);
    return m;
}


  static perspective(fovY: number, aspectRatio: number, near: number, far: number) {
    const m = Matrix4.identity();
    const radians = fovY * Math.PI / 180 * 0.5;
    const top = Math.tan(radians)*near;
    const right = aspectRatio*top;
    m.set(0, 0, near/right);
    m.set(1, 1, near/top);
    m.set(2, 2, (near+far)/(near-far));
    m.set(2, 3, (2*near*far)/(near-far));
    m.set(3, 2, -1);
    m.set(3, 3, 0);
    return m;
}






}