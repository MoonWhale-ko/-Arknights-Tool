
precision highp float;
precision highp int;
uniform 	mediump float _MainTexChannel;
uniform mediump sampler2D _MainTex;
varying mediump vec2 vs_TEXCOORD0;
varying mediump vec4 vs_COLOR0;
vec4 u_xlat0;
mediump vec4 u_xlat16_0;
vec4 u_xlat1;
bvec4 u_xlatb1;
mediump float u_xlat16_2;
vec4 sampleUnity(sampler2D source,vec2 uv){return texture2D(source,vec2(uv.x,1.0-uv.y));}
float nativeRoundEven(float v){float f=floor(v),r=v-f;return r<0.5?f:r>0.5?f+1.0:mod(f,2.0)==0.0?f:f+1.0;}
void main()
{
    u_xlat0 = sampleUnity(_MainTex, vs_TEXCOORD0.xy);
    u_xlatb1 = equal(vec4(_MainTexChannel), vec4(0.0, 1.0, 2.0, 3.0));
    u_xlat16_2 = (u_xlatb1.w) ? u_xlat0.z : u_xlat0.w;
    u_xlat16_2 = (u_xlatb1.z) ? u_xlat0.y : u_xlat16_2;
    u_xlat16_2 = (u_xlatb1.y) ? u_xlat0.x : u_xlat16_2;
    u_xlat16_0 = (u_xlatb1.x) ? u_xlat0 : vec4(u_xlat16_2);
    u_xlat1 = vs_COLOR0 + vs_COLOR0;
    u_xlat0 = u_xlat16_0 * u_xlat1;
    gl_FragColor.w = u_xlat0.w;
    gl_FragColor.w = clamp(gl_FragColor.w, 0.0, 1.0);
    gl_FragColor.xyz = u_xlat0.xyz;
    gl_FragColor.rgb *= gl_FragColor.a;
    return;
}