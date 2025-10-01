uniform mat4 jointTransforms[13];
uniform mat4 clipFromEye;
uniform mat4 eyeFromWorld;
uniform mat4 worldFromPose;

in vec3 position;
in vec3 normal;
in vec3 color;
in vec4 weights;
in vec4 joints;


out vec3 fragColor;

void main() {
  mat4 poseFromModel = 
    weights.x * jointTransforms[int(joints.x)] +
    weights.y * jointTransforms[int(joints.y)] +
    weights.z * jointTransforms[int(joints.z)] +
    weights.w * jointTransforms[int(joints.w)];
  gl_Position = clipFromEye * eyeFromWorld * worldFromPose * poseFromModel * vec4(position, 1.0);
  fragColor = color;
}