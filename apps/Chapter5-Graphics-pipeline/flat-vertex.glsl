uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec3 position;
in vec3 normal;

out vec3 mixNormal;

void main() {
  gl_Position = clipFromEye * eyeFromWorld * worldFromModel * vec4(position, 1.0);
  mixNormal = normal;
}

/*
uniform mat4 clipFromEye;
uniform mat4 eyeFromWorld;
uniform mat4 worldFromPose;
uniform mat4 jointTransforms[JOINT_TRANSFORM_COUNT];

in vec3 position;
in vec3 normal;
in vec4 joints;
in vec4 weights;

out vec3 mixNormal;

void main() {
  mat4 poseFromModel = 
    weights.x * jointTransforms[int(joints.x)] +
    weights.y * jointTransforms[int(joints.y)] +
    weights.z * jointTransforms[int(joints.z)] +
    weights.w * jointTransforms[int(joints.w)];
  gl_Position = clipFromEye * eyeFromWorld * worldFromPose * poseFromModel * vec4(position, 1.0);
  mixNormal = normal;
}
*/