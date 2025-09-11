uniform mat4 clipFromWorld;
uniform float radians;
uniform vec3 offset;
uniform vec3 factors;

in vec3 position;
in vec3 normal;
out vec3 mixNormal;


void main() {
  vec3 rotatedPosition = vec3(
    position.x,
    position.y * cos(radians) - position.z * sin(radians),
    position.y * sin(radians) + position.z * cos(radians)
  );
  vec3 scaledPosition = rotatedPosition * factors;
  vec3 translatedPosition = scaledPosition + offset;
  gl_Position = clipFromWorld * vec4(translatedPosition, 1.0);
  mixNormal = normal;
}