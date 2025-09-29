uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec3 position;
in vec3 normal;

out vec3 mixPosition;
out vec3 mixNormal;

void main() {
  gl_Position = vec4(position, 1.0);
  mixPositionEye = (eyeFromWorld * worldFromModel * vec4(position, 1.0)).xyz;
  mixNormalEye = (eyeFromWorld * worldFromModel * vec4(normal, 0.0)).xyz;
}

