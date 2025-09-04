in vec3 position;
in vec3 color; 
out vec3 fragColor;


void main() {
  gl_Position = vec4(position, 1.0);
  gl_PointSize = 10.0;
  fragColor = color;
}
