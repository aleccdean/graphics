import { lerp } from "./math-utilities.js";
import { Trimesh } from "./trimesh.js";
import { Vector3 } from "./vector.js";

export class Prefab {
    static grid(width: number, height: number, longitudeCount: number, latitudeCount: number) {
      const positions: Vector3[] = [];
  
      for (let lat = 0; lat < latitudeCount; ++lat) {
        const y = lat / (latitudeCount - 1) * height;
        for (let lon = 0; lon < longitudeCount; ++lon) {
          const x = lon / (longitudeCount - 1) * width;
          positions.push(new Vector3(x, y, 0));
        }
      }

      const index = (lon: number, lat: number) => {
        return lat * longitudeCount + lon;
      };

      const faces: number[][] = [];
    for (let lat = 0; lat < latitudeCount - 1; ++lat) {
      for (let lon = 0; lon < longitudeCount - 1; ++lon) {
        const nextLon = lon + 1;
        const nextLat = lat + 1;

        faces.push([ // bottom-left triangle
            index(lon, lat),
            index(nextLon, lat),
            index(lon, nextLat)
        ]);
        faces.push([/* TODO: top-right triangle */
            index(nextLon, lat),
            index(nextLon, nextLat),
            index(lon, nextLat)
        ]);
      }
    }

    return new Trimesh(positions, faces);
  }

  static cylinder(radius: number, height: number, longitudeCount: number, latitudeCount: number) {
    const positions: Vector3[] = [];

    for (let lat = 0; lat < latitudeCount; ++lat) {
      const y = lat / (latitudeCount - 1) * height;
      for (let lon = 0; lon < longitudeCount; ++lon) {
        const radians = lon / longitudeCount * 2 * Math.PI;
        const x = radius * Math.cos(radians);
        const z = radius * Math.sin(radians);
        positions.push(new Vector3(x, y, z));
      }
    }

    const index = (lon: number, lat: number) => {
        return lat * longitudeCount + lon;
      };

    const faces: number[][] = [];
    for (let lat = 0; lat < latitudeCount - 1; ++lat) {
      for (let lon = 0; lon < longitudeCount; ++lon) {
        let nextLon = (lon + 1) % longitudeCount;
        let nextLat = lat + 1;

        faces.push([
          index(lon, lat),
          index(nextLon, lat),
          index(lon, nextLat),
        ]);

        faces.push([
          index(nextLon, lat),
          index(nextLon, nextLat),
          index(lon, nextLat),
        ]);
      }
    }

    return new Trimesh(positions, faces);
  }

  static cone(topRadius: number, bottomRadius: number, length: number, longitudeCount: number, latitudeCount: number) {
    const positions: Vector3[] = [];
    length = Math.abs(length); //FILLER
    for (let lat = 0; lat < latitudeCount; ++lat) {
      const radius = lerp(bottomRadius, topRadius, lat / (latitudeCount - 1));
      //below code maybe?
      let x = radius * Math.cos(radius);
      let y = radius * Math.sin(radius);

      for (let lon = 0; lon < longitudeCount; ++lon) {
        const lonRadians = lon / longitudeCount * -2 * Math.PI;
        positions.push(new Vector3(
          x * Math.cos(lonRadians),
          y,
          x * Math.sin(lonRadians)
        ));
      }
    }

    const index = (lon: number, lat: number) => {
      return lat * longitudeCount + lon;
    };

  const faces: number[][] = [];
  for (let lat = 0; lat < latitudeCount - 1; ++lat) {
    for (let lon = 0; lon < longitudeCount; ++lon) {
      let nextLon = (lon + 1) % longitudeCount;
      let nextLat = lat + 1;

      faces.push([
        index(lon, lat),
        index(nextLon, lat),
        index(lon, nextLat),
      ]);

      faces.push([
        index(nextLon, lat),
        index(nextLon, nextLat),
        index(lon, nextLat),
      ]);
    }
  }
  return new Trimesh(positions, faces);
  }

  static sphere(radius: number, longitudeCount: number, latitudeCount: number) {
    const positions: Vector3[] = [];

    for (let lat = 0; lat < latitudeCount; ++lat) {
      // First find the position on the prime meridian.
      const latRadians = lerp(-Math.PI * 0.5, Math.PI * 0.5, lat / (latitudeCount - 1));
      let x = radius * Math.cos(latRadians);
      let y = radius * Math.sin(latRadians);

      for (let lon = 0; lon < longitudeCount; ++lon) {
        const lonRadians = lon / longitudeCount * -2 * Math.PI;
        positions.push(new Vector3(
          x * Math.cos(lonRadians),
          y,
          x * Math.sin(lonRadians)
        ));
      }
    }

    const index = (lon: number, lat: number) => {
      return lat * longitudeCount + lon;
    };

  const faces: number[][] = [];
  for (let lat = 0; lat < latitudeCount - 1; ++lat) {
    for (let lon = 0; lon < longitudeCount; ++lon) {
      let nextLon = (lon + 1) % longitudeCount;
      let nextLat = lat + 1;

      faces.push([
        index(lon, lat),
        index(nextLon, lat),
        index(lon, nextLat),
      ]);

      faces.push([
        index(nextLon, lat),
        index(nextLon, nextLat),
        index(lon, nextLat),
      ]);
    }
  }

    return new Trimesh(positions, faces);
  }


  static torus(innerRadius: number, outerRadius: number, longitudeCount: number, latitudeCount: number){
    const positions: Vector3[] = [];

    for (let lat = 0; lat < latitudeCount; ++lat) {
      // First find the position on the prime meridian.
      const latRadians = lerp(-Math.PI, Math.PI, lat / (latitudeCount - 1));
      let x = innerRadius+outerRadius * Math.cos(latRadians);
      let y = innerRadius+outerRadius * Math.sin(latRadians);

      for (let lon = 0; lon < longitudeCount; ++lon) {
        const lonRadians = lon / longitudeCount * -2 * Math.PI;
        positions.push(new Vector3(
          x * Math.cos(lonRadians),
          y,
          x * Math.sin(lonRadians)
        ));
      }
    }

    const index = (lon: number, lat: number) => {
      return lat * longitudeCount + lon;
    };

  const faces: number[][] = [];
  for (let lat = 0; lat < latitudeCount - 1; ++lat) {
    for (let lon = 0; lon < longitudeCount; ++lon) {
      let nextLon = (lon + 1) % longitudeCount;
      let nextLat = lat + 1;

      faces.push([
        index(lon, lat),
        index(nextLon, lat),
        index(lon, nextLat),
      ]);

      faces.push([
        index(nextLon, lat),
        index(nextLon, nextLat),
        index(lon, nextLat),
      ]);
    }
  }

    return new Trimesh(positions, faces);

  }


}