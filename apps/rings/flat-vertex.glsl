uniform float scale;
uniform vec3 offsets;

in vec3 position;

void main() {
  vec3 scaledPosition = scale * position;
  vec3 translatedPosition = scaledPosition + offsets;
  gl_Position = vec4(translatedPosition, 1.0);
  gl_PointSize = 10.0;
}