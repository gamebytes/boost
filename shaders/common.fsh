//uniform vec3 color;
uniform sampler2D texture;
uniform sampler2D texture2;
uniform vec3 light;
//uniform float shadow;
//uniform float highlight;
            
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vColor;


void main() {
    vec3 color = vColor;

    vec4 textureColor = texture2D(texture, vec2(vUv.s, vUv.t));

    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float near = 0.0;
    float far = 600.0;
    float depthcolor = 1.0 - smoothstep( near, far, depth );
    
    vec3 l = light;
    l = normalize(l);
    float d0 = max(0.2,dot(vNormal, l));
    
    // faking shadow
    //if (shadow == 1.0 && d0 > 0.82) {
        //float p = (d0 - 0.82);
        //d0 = d0-min(p*12.0, 0.7);
    //}
    vec4 Ca = textureColor;
    vec3 Cb = color;
    vec3 c = Ca.rgb * Ca.a + Cb.rgb * (1.0 - Ca.a);
    //c = c * highlight;

    gl_FragColor = vec4(c * depthcolor, textureColor.a);
    
}


