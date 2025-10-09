uniform vec3 lightDirection = vec3(0.0, 0.0, 1.0);
const vec3 albedo = vec3(0.2, 0.8, 0.5);
const float ambientFactor = 0.2;
in vec3 mixNormal;

out vec4 fragmentColor;

void main() {
  vec3 normal = normalize(mixNormal);
  float litness = max(0.0, dot(normal, lightDirection));

  vec3 ambient = albedo * ambientFactor;
  vec3 diffuse = litness * albedo * (1.0 - ambientFactor);

  

  vec3 rgb = ambient + diffuse;
  fragmentColor = vec4(rgb, 1.0);
}