uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec3 position;
in vec3 normal;
in vec2 texPosition;

out vec3 mixPositionEye;
out vec3 mixNormalEye;
out vec2 mixTexPosition;

void main() {
  gl_Position = clipFromEye * eyeFromWorld * worldFromModel * vec4(position, 1.0);
  mixPositionEye = ( eyeFromWorld * worldFromModel * vec4(position, 1.0)).xyz;
  mixNormalEye = (eyeFromWorld * worldFromModel * vec4(normal, 0.0)).xyz;
  mixTexPosition = texPosition;
}

