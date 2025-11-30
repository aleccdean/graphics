uniform mat4 clipFromEye;
uniform mat4 eyeFromWorld;
uniform mat4 worldFromModel;
uniform vec3 cameraRight;
uniform vec3 cameraUp;

in vec3 position;
in vec2 texPosition;
out vec2 mixTexPosition;

void main() {
  vec2 factors = vec2( texPosition - vec2(1)) * vec2(2.0, -2.0);
  vec3 outerPosition =  position + factors.x * cameraRight + factors.y * cameraUp;
  gl_Position = clipFromEye * eyeFromWorld * worldFromModel * vec4(outerPosition, 1.0);
  mixTexPosition = texPosition;
}