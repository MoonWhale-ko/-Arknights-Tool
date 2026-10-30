
precision highp float;
precision highp int;
uniform 	mediump float _Amount;
uniform 	mediump float _BorderWidth;
uniform mediump sampler2D _DissolveTex;
uniform mediump sampler2D _MainTex;
varying mediump vec4 vs_TEXCOORD0;
varying mediump vec4 vs_COLOR0;
mediump float u_xlat16_0;
vec4 u_xlat1;
mediump float u_xlat16_1;
mediump vec4 u_xlat16_2;
mediump float u_xlat16_3;
vec4 sampleUnity(sampler2D source,vec2 uv){return texture2D(source,vec2(uv.x,1.0-uv.y));}
float nativeRoundEven(float v){float f=floor(v),r=v-f;return r<0.5?f:r>0.5?f+1.0:mod(f,2.0)==0.0?f:f+1.0;}
void main()
{
    u_xlat16_0 = _Amount + 0.5;
    u_xlat16_0 = nativeRoundEven(u_xlat16_0);
    u_xlat16_0 = (-u_xlat16_0) + 1.0;
    u_xlat16_1 = sampleUnity(_DissolveTex, vs_TEXCOORD0.zw).x;
    u_xlat16_3 = u_xlat16_1 + (-_Amount);
    u_xlat16_0 = _BorderWidth * u_xlat16_0 + u_xlat16_3;
    u_xlat16_0 = u_xlat16_0 / _BorderWidth;
    u_xlat16_0 = clamp(u_xlat16_0, 0.0, 1.0);
    u_xlat1 = vs_COLOR0 + vs_COLOR0;
    u_xlat16_2 = sampleUnity(_MainTex, vs_TEXCOORD0.xy);
    u_xlat1 = u_xlat1 * u_xlat16_2;
    gl_FragColor.w = u_xlat16_0 * u_xlat1.w;
    gl_FragColor.w = clamp(gl_FragColor.w, 0.0, 1.0);
    gl_FragColor.xyz = u_xlat1.xyz;
    gl_FragColor.rgb = clamp(gl_FragColor.rgb,0.0,1.0) * gl_FragColor.a;
    return;
}