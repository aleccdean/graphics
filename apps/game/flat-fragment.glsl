uniform vec3 lightPositionEye;
uniform vec3 albedo;
uniform vec3 diffuseColor;
uniform float ambientFactor;
uniform vec3 specularColor;
uniform float shininess;

in vec3 mixPositionEye;
in vec3 mixNormalEye;

out vec4 fragmentColor;

void main() {
  vec3 lightDirection = normalize(lightPositionEye - mixPositionEye);
  vec3 normal = normalize(mixNormalEye); 
  //if (!gl_FrontFacing) {
    //normal = -normal;
  //}
  float litness = max(0.0, dot(normal, lightDirection));

  vec3 ambient = ambientFactor * albedo * diffuseColor;
  vec3 diffuse = (1.0 - ambientFactor) * litness * albedo * diffuseColor;



  vec3 rgb = ambient + diffuse;
  fragmentColor = vec4(rgb, 1.0);
}