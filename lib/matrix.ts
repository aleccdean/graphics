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
      
      
      
  }
  