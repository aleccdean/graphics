uniform vec3 lightPositionEye;
uniform vec3 albedo;
uniform vec3 diffuseColor;
uniform float ambientFactor;
uniform vec3 specularColor;
uniform float shininess;
uniform sampler2D atomTexture;

in vec3 mixPositionEye;
in vec3 mixNormalEye;
in vec2 mixTexPosition;

out vec4 fragmentColor;

void main() {
  vec4 atom = texture2D(atomTexture, mixTexPosition);
  if (atom.a > 0.3) {
    discard;
  }
  vec3 rgb = vec3(atom.a);
  fragmentColor = vec4(rgb, 1.0);

}