in vec3 fragColor;
out vec4 fragmentColor;
uniform vec2 dimensions; 
uniform vec2 mouse;
uniform float time;

vec3 f() {
  vec3 color = vec3(gl_FragCoord.x / dimensions.x * fragColor.x,gl_FragCoord.y / dimensions.y * fragColor.y, fragColor.z);
  return color;
} 

void main() {
  fragmentColor = vec4(f(), 1.0);
}
