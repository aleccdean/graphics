uniform mat4 jointTransforms[32]; // supports up to 32 joints
uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;
uniform int animation; // 1 = apply skinning, 0 = rigid

in vec4 weights;
in vec4 joints;
in vec3 position;
in vec3 normal;
in vec2 texPosition;
in vec3 color;

out vec3 mixPositionEye;
out vec3 mixNormalEye;
out vec2 mixTexPosition;
out vec3 mixColor;

void main() {
  mat4 poseFromModel = mat4(1.0);
  if (animation == 1) {
    int j0 = int(joints.x);
    int j1 = int(joints.y);
    int j2 = int(joints.z);
    int j3 = int(joints.w);
    poseFromModel = 
      weights.x * jointTransforms[j0] +
      weights.y * jointTransforms[j1] +
      weights.z * jointTransforms[j2] +
      weights.w * jointTransforms[j3];
  }
  gl_Position = clipFromEye * eyeFromWorld * worldFromModel * poseFromModel * vec4(position, 1.0);
  mixPositionEye = ( eyeFromWorld * worldFromModel * poseFromModel * vec4(position, 1.0)).xyz;
  mixNormalEye = (eyeFromWorld * worldFromModel * poseFromModel * vec4(normal, 0.0)).xyz;
  mixTexPosition = texPosition;
  mixColor = color;
}

