in vec3 fragColor;
out vec4 fragmentColor;
uniform vec2 dimensions; 
uniform vec2 mouse;
uniform float time;

vec3 f() {
  vec2 current = gl_FragCoord.xy / dimensions.xy;
  float x = gl_FragCoord.x / dimensions.x;
  float d = distance(current, mouse.xy / dimensions.xy);
  
  vec3 color = vec3(current.x * mouse.x / dimensions.x, current.y * mouse.y / dimensions.y, current.x * current.y);

  return color;
} 

void main() {
  fragmentColor = vec4(f(), 1.0);
}
