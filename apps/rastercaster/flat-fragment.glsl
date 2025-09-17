in vec3 fragColor;
out vec4 fragmentColor;
uniform vec2 dimensions; 
uniform vec2 mouse;
uniform float time;

vec3 f() {
  // TODO: define a vec3 named color.
  return color;
} 

void main() {
  fragmentColor = vec4(f(), 1.0);
}
