uniform mat4 jointTransforms[64]; // supports up to 64 joints
uniform int animation; // 1 = animate, 0 = rigid
uniform mat4 textureFromWorld; //For shadows
uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec4 weights;
in vec4 joints;
in vec3 position;
in vec3 normal;
in vec2 texPosition;
in vec3 color;

out vec3 mixPositionEye;
out vec3 mixNormalEye;
out vec4 mixTexPosition;
out vec2 mixTexCoord;
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
  mixTexPosition = textureFromWorld * worldFromModel * poseFromModel * vec4(position, 1.0);
  mixTexCoord = texPosition;
  mixColor = color;
}

