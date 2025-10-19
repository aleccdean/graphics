uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec3 position;
in vec3 normal;

out vec3 mixPositionEye;
out vec3 mixNormalEye;

void main() {
  gl_Position = vec4(position, 1.0);
  gl_PointSize = 10.0;
  mixPositionEye = (clipFromEye * eyeFromWorld * worldFromModel * vec4(position, 1.0)).xyz;
  mixNormalEye = (clipFromEye * eyeFromWorld * worldFromModel * vec4(normal, 0.0)).xyz;
}

