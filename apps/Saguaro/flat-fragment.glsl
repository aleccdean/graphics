out vec4 fragmentColor;
uniform vec3 rgb;
in vec3 fragNormal;

void main() {
  //fragmentColor = vec4(fragNormal, 1.0); 
  float intensity = length(normalize(fragNormal));
  fragmentColor = vec4(0.0, intensity, 0.0, 1.0);
}