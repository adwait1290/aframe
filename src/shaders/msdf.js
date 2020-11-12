var registerShader = require('../core/shader').registerShader;

/**
 * Multi-channel signed distance field.
 * Used by text component.
 */
module.exports.Shader = registerShader('msdf', {
  schema: {
    alphaTest: {type: 'number', is: 'uniform', default: 0.5},
    color: {type: 'color', is: 'uniform', default: 'white'},
    map: {type: 'map', is: 'uniform'},
    negate: {type: 'boolean', is: 'uniform', default: true},
    opacity: {type: 'number', is: 'uniform', default: 1.0}
  },

  raw: true,

  vertexShader: [
    '#ifdef AFRAME_enable_multiview',
    '  #extension GL_OVR_multiview : require',
    '  layout(num_views = 2) in;',
    '#endif',
    'attribute vec2 uv;',
    'attribute vec3 position;',
    'uniform mat4 projectionMatrix;',
    'uniform mat4 modelViewMatrix;',
    '#ifdef AFRAME_enable_multiview',
    '  uniform mat4 modelViewMatrix2;',
    '  uniform mat4 projectionMatrix2;',
    '  #define modelViewMatrix (gl_ViewID_OVR==0u?modelViewMatrix:modelViewMatrix2)',
    '  #define projectionMatrix (gl_ViewID_OVR==0u?projectionMatrix:projectionMatrix2)',
    '#endif',
    'varying vec2 vUV;',
    'void main(void) {',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '  vUV = uv;',
    '}'
  ].join('\n'),

  fragmentShader: [
    '#ifdef GL_OES_standard_derivatives',
    '#extension GL_OES_standard_derivatives: enable',
    '#endif',

    'precision highp float;',
    'uniform bool negate;',
    'uniform float alphaTest;',
    'uniform float opacity;',
    'uniform sampler2D map;',
    'uniform vec3 color;',
    'varying vec2 vUV;',

    'float median(float r, float g, float b) {',
    '  return max(min(r, g), min(max(r, g), b));',
    '}',

    // FIXME: Experimentally determined constants.
    '#define BIG_ENOUGH 0.001',
    '#define MODIFIED_ALPHATEST (0.02 * isBigEnough / BIG_ENOUGH)',

    'void main() {',
    '  vec3 tSample = texture2D(map, vUV).rgb;',
    '  if (negate) { tSample = 1.0 - tSample; }',

    '  float sigDist = median(tSample.r, tSample.g, tSample.b) - 0.5;',
    '  float alpha = clamp(sigDist / fwidth(sigDist) + 0.5, 0.0, 1.0);',
    '  float dscale = 0.353505;',
    '  vec2 duv = dscale * (dFdx(vUV) + dFdy(vUV));',
    '  float isBigEnough = max(abs(duv.x), abs(duv.y));',

    // When texel is too small, blend raw alpha value rather than supersampling.
    // FIXME: Experimentally determined constant.
    '  // Do modified alpha test.',
    '  if (isBigEnough > BIG_ENOUGH) {',
    '    float ratio = BIG_ENOUGH / isBigEnough;',
    '    alpha = ratio * alpha + (1.0 - ratio) * (sigDist + 0.5);',
    '  }',

    '  // Do modified alpha test.',
    '  if (alpha < alphaTest * MODIFIED_ALPHATEST) { discard; return; }',
    '  gl_FragColor = vec4(color.xyz, alpha * opacity);',
    '}'
  ].join('\n')
});
