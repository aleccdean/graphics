uniform mat4 clipFromWorld;
uniform mat4 worldFromModel;
in vec3 position;
in vec3 normal;
out vec3 fragNormal;

void main() {
  gl_Position = clipFromWorld * worldFromModel * vec4(position, 1.0);
  fragNormal = normal;
}