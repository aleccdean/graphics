uniform vec3 lightPositionEye;
uniform vec3 albedo;
uniform vec3 diffuseColor;
uniform float ambientFactor;
uniform vec3 specularColor;
uniform float shininess;
uniform sampler2D grassTexture;
uniform sampler2D modelTexture;
uniform sampler2D depthTexture;
uniform int useModelTexture;
uniform int useVertexColor;

in vec3 mixPositionEye;
in vec3 mixNormalEye;
in vec4 mixTexPosition;
in vec2 mixTexCoord;
in vec3 mixColor;

out vec4 fragmentColor;

void main() {
  vec3 lightDirection = normalize(lightPositionEye - mixPositionEye);
  vec3 normal = normalize(mixNormalEye); 
  if (!gl_FrontFacing) {
    normal = -normal;
  }
  float litness = max(0.0, dot(normal, lightDirection));

  vec3 ambient = ambientFactor * albedo * diffuseColor;
  vec3 diffuse = (1.0 - ambientFactor) * litness * albedo * diffuseColor;



  // Choose final color source
  vec3 baseColor;
  if (useModelTexture == 1) {
    baseColor = texture(modelTexture, mixTexCoord).rgb;
  } else if (useVertexColor == 1) {
    baseColor = mixColor;
  } else {
    baseColor = texture(grassTexture, mixTexCoord).rgb;
  }

  // Shadows
  vec4 texPosition = mixTexPosition / mixTexPosition.w;
  float fragmentDepth = texPosition.z - 0.0005;
  float closestDepth = texture(depthTexture, texPosition.xy).r;
  float shadowFactor = closestDepth < fragmentDepth ? 0.5 : 1.0;
  vec3 lighting = ambient + diffuse * shadowFactor;
  vec3 rgb = baseColor * lighting;
  fragmentColor = vec4(rgb, 1.0);
}