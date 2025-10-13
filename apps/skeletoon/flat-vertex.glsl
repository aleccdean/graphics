uniform mat4 jointTransforms[13];
uniform mat4 worldFromModel;
uniform mat4 eyeFromWorld;
uniform mat4 clipFromEye;

in vec3 position;
in vec3 normal;
in vec4 weights;
in vec4 joints;

out vec3 mixPositionEye;
out vec3 mixNormalEye;

void main() {
  mat4 poseFromModel = 
    weights.x * jointTransforms[int(joints.x)] +
    weights.y * jointTransforms[int(joints.y)] +
    weights.z * jointTransforms[int(joints.z)] +
    weights.w * jointTransforms[int(joints.w)];
  gl_Position = clipFromEye * eyeFromWorld * worldFromModel * poseFromModel * vec4(position, 1.0);
  mixPositionEye = (eyeFromWorld * worldFromModel * vec4(position, 1.0)).xyz;
  mixNormalEye = (eyeFromWorld * worldFromModel * vec4(normal, 0.0)).xyz;
}
