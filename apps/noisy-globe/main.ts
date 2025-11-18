import { VertexAttributes } from 'lib/vertex-attributes.js';
import { fetchText } from 'lib/web-utilities.js';
import { ShaderProgram } from 'lib/shader-program.js';
import { VertexArray } from 'lib/vertex-array.js';
import { Matrix4 } from 'lib/matrix.js';
import { Gltf } from 'lib/static-gltf.js';
import { Vector3 } from 'lib/vector.js';
import { noiseGlobe } from 'lib/noise.js';
import { Field2 } from 'lib/field.js';

async function initialize() {
  const width = 1028;
  const height = 512;
  const globe = noiseGlobe(width,height,40,6);
  const pixels = new Uint8ClampedArray(width*height*4);

  for(let r = 0; r < height; ++r) {
    for (let c = 0; c < width; ++c) {
      let i = (r * width +c) * 4;
      let n = globe.get2(c, r);
      const colorVal = color(n)
      pixels[i + 0] = colorVal.x;
      pixels[i + 1] = colorVal.y;
      pixels[i + 2] = colorVal.z;
      pixels[i + 3] = 255;
    }
  }

  const image = document.getElementById('image') as HTMLImageElement;
  const imageData = new ImageData(pixels, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);
  image.src = canvas.toDataURL();
  
}

function color(n:number) {
  const water = 0.3;
  const sand = 0.5;
  const grass = 0.7
  const mountain = 0.9;
  const snow = 1;
  let colorVals = new Vector3(0,0,0);
  if (n <= water) {
      const low = new Vector3(0,0,255);
      const high = new Vector3(0,204,255);
      const blend = n/0.3
      colorVals = low.lerp(high, blend);

    } else if(n <= sand) {
      const low = new Vector3(255,255,0);
      const high = new Vector3(255,255,153);
      const blend = (n-water)/(sand-water)
      colorVals = low.lerp(high, blend);

    } else if(n <= grass) {
      const low = new Vector3(0,128,0);
      const high = new Vector3(0,255,0);
      const blend = (n-sand)/(grass-sand)
      colorVals = low.lerp(high, blend);

    } else if(n <= mountain) {
      const low = new Vector3(51,51,0);
      const high = new Vector3(51,51,51);
      const blend = (n-grass)/(mountain-grass)
      colorVals = low.lerp(high, blend);

    } else {
      const low = new Vector3(192,192,192);
      const high = new Vector3(255, 255, 255);
      const blend = (n-mountain)/(snow-mountain)
      colorVals = low.lerp(high, blend);

    }
  return colorVals;

}

window.addEventListener('load', () => initialize());