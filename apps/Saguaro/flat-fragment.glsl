out vec4 fragmentColor;
uniform vec3 rgb;

void main() {
  fragmentColor = vec4(rgb, 1.0);
}