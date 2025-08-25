import { Vector3 } from './vector.js';

const vector = new Vector3(4, 3, 12);
const vector2 = vector.normalize()
console.log(vector2.magnitude);