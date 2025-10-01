out vec4 fragmentColor;
uniform vec3 rgb;

in vec3 mixNormal;

void main() {
  fragmentColor = vec4(mixNormal, 1.0);
}