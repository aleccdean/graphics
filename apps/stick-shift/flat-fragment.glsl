out vec4 fragmentColor;
uniform vec3 rgb;

in vec3 fragColor;

void main() {
  fragmentColor = vec4(fragColor, 1.0);
}