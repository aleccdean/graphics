uniform mat4 clipFromWorld;
uniform float radians;
uniform vec3 offset;
uniform vec3 factors;

in vec3 position;


void main() {
  vec3 rotatedPosition = vec3(
    position.x * cos(radians) - position.y * sin(radians),
    position.x * sin(radians) + position.y * cos(radians),
    position.z
  );
  vec3 scaledPosition = rotatedPosition * factors;
  vec3 translatedPosition = scaledPosition + offset;
  gl_Position = clipFromWorld * vec4(translatedPosition, 1.0);
}