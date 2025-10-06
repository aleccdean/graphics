in vec3 mixNormal;
out vec4 fragmentColor;
uniform vec3 rgb;

void main() {
  fragmentColor = vec4(mixNormal, 1.0);
}