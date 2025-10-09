in vec3 vColor;
in vec3 vPosition;
out vec4 fragmentColor;
vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
// ...

void main() {
  vec3 right = dFdx(vPosition);
  vec3 up = dFdy(vPosition);
  vec3 normal = normalize(cross(right, up));
  float litness = max(0.0, dot(normal, lightDirection));
  vec3 color = litness * vColor;
  fragmentColor = vec4(color, 1.0);
}