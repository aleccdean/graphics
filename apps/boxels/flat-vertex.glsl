uniform mat4 clipFromWorld;
uniform mat4 worldFromModel;
uniform float radians;
uniform vec3 offset;
uniform vec3 factors;


in vec3 position;
in vec3 normal;
out vec3 mixNormal;

void main() {
  gl_Position = worldFromModel * clipFromWorld * vec4(position, 1.0);
  mixNormal = normal;
}