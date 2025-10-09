uniform mat4 clipFromWorld;
uniform mat4 worldFromModel;

in vec3 position;
in vec3 color;
out vec3 vColor;
out vec3 vPosition;

void main() {
  gl_Position = worldFromModel * clipFromWorld * vec4(position, 1.0);
  vColor = color;
  vPosition = position;
}