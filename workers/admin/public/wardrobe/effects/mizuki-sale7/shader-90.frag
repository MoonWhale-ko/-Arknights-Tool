#ifdef FRAGMENT
#version 300 es

precision highp float;
precision highp int;
#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1
#if HLSLCC_ENABLE_UNIFORM_BUFFERS
#define UNITY_UNIFORM
#else
#define UNITY_UNIFORM uniform
#endif
#define UNITY_SUPPORTS_UNIFORM_LOCATION 1
#if UNITY_SUPPORTS_UNIFORM_LOCATION
#define UNITY_LOCATION(x) layout(location = x)
#define UNITY_BINDING(x) layout(binding = x, std140)
#else
#define UNITY_LOCATION(x)
#define UNITY_BINDING(x) layout(std140)
#endif
uniform 	vec4 _Time;
uniform 	int _ToggleUseDisturb2;
uniform 	int _ToggleUseDissolve;
uniform 	mediump vec4 _MainTex_ST;
uniform 	mediump vec4 _DissolveTex_ST;
uniform 	mediump vec4 _MainColor;
uniform 	mediump float _MainColorACtrl;
uniform 	mediump float _IntensityU;
uniform 	mediump float _IntensityU_02;
uniform 	mediump float _IntensityV;
uniform 	mediump float _IntensityV_02;
uniform 	mediump vec4 _UVTween;
uniform 	mediump float _AnchorU;
uniform 	mediump float _AnchorU_02;
uniform 	mediump float _AnchorV;
uniform 	mediump float _AnchorV_02;
uniform 	mediump float _Amount;
uniform 	mediump float _BorderWidth;
UNITY_LOCATION(0) uniform mediump sampler2D _DisturTex;
UNITY_LOCATION(1) uniform mediump sampler2D _DisturTex_02;
UNITY_LOCATION(2) uniform mediump sampler2D _MainTex;
UNITY_LOCATION(3) uniform mediump sampler2D _DissolveTex;
in mediump vec2 vs_TEXCOORD0;
in highp vec4 vs_TEXCOORD1;
in highp vec4 vs_TEXCOORD2;
in mediump vec4 vs_COLOR0;
layout(location = 0) out mediump vec4 SV_Target0;
vec4 u_xlat0;
mediump vec4 u_xlat16_0;
mediump vec2 u_xlat16_1;
mediump vec2 u_xlat16_2;
vec2 u_xlat3;
mediump float u_xlat10_3;
mediump float u_xlat16_5;
vec2 u_xlat8;
mediump float u_xlat16_8;
mediump float u_xlat10_8;
bool u_xlatb8;
mediump vec2 u_xlat16_9;
void main()
{
    u_xlat0 = _Time.yyyy * _UVTween;
    u_xlat0 = fract(u_xlat0);
    u_xlat8.xy = u_xlat0.zw + vs_TEXCOORD1.xy;
    u_xlat16_8 = texture(_DisturTex, u_xlat8.xy).x;
    u_xlat16_1.xy = vec2(u_xlat16_8) + (-vec2(_AnchorU, _AnchorV));
    u_xlatb8 = 0<_ToggleUseDisturb2;
    if(u_xlatb8){
        u_xlat10_8 = texture(_DisturTex_02, vs_TEXCOORD2.xy).x;
        u_xlat16_9.xy = vec2(u_xlat10_8) + (-vec2(_AnchorU_02, _AnchorV_02));
    } else {
        u_xlat16_9.x = float(0.0);
        u_xlat16_9.y = float(0.0);
    }
    u_xlat16_1.xy = u_xlat16_1.xy * vec2(_IntensityU, _IntensityV) + vs_TEXCOORD0.xy;
    u_xlat16_2.x = u_xlat16_9.x * _IntensityU_02;
    u_xlat16_2.y = u_xlat16_9.y * _IntensityV_02;
    u_xlat16_1.xy = u_xlat16_1.xy + u_xlat16_2.xy;
    u_xlat8.xy = u_xlat16_1.xy * _MainTex_ST.xy + _MainTex_ST.zw;
    u_xlat0.xy = u_xlat0.xy + u_xlat8.xy;
    u_xlat16_0 = texture(_MainTex, u_xlat0.xy);
    u_xlat16_0 = u_xlat16_0 * _MainColor;
    u_xlat16_0 = u_xlat16_0 * vs_COLOR0;
    u_xlat16_0 = u_xlat16_0 + u_xlat16_0;
    u_xlat16_9.x = _MainColor.w + -1.0;
    u_xlat16_9.x = _MainColorACtrl * u_xlat16_9.x + 1.0;
    u_xlat16_0 = u_xlat16_0.wxyz * u_xlat16_9.xxxx;
    if(_ToggleUseDissolve != 0) {
        u_xlat3.xy = u_xlat16_1.xy * _DissolveTex_ST.xy + _DissolveTex_ST.zw;
        u_xlat10_3 = texture(_DissolveTex, u_xlat3.xy).x;
        u_xlat16_1.x = u_xlat10_3 + (-_Amount);
        u_xlat16_5 = _Amount + 0.5;
        u_xlat16_5 = roundEven(u_xlat16_5);
        u_xlat16_5 = (-u_xlat16_5) + 1.0;
        u_xlat16_1.x = _BorderWidth * u_xlat16_5 + u_xlat16_1.x;
        u_xlat16_1.x = u_xlat16_1.x / _BorderWidth;
        u_xlat16_1.x = clamp(u_xlat16_1.x, 0.0, 1.0);
        u_xlat16_0.x = u_xlat16_0.x * u_xlat16_1.x;
        u_xlat16_0.x = clamp(u_xlat16_0.x, 0.0, 1.0);
    }
    SV_Target0 = u_xlat16_0.yzwx;
    return;
}


#endif
