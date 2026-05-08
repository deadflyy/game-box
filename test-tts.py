#!/usr/bin/env python3
import os
import base64

try:
    from openai import OpenAI
except ImportError:
    print("请先安装openai库: pip3 install openai")
    exit(1)

# 从环境变量获取API Key
api_key = os.environ.get("MIMO_API_KEY")
if not api_key:
    print("错误: 环境变量 MIMO_API_KEY 未设置")
    print("请设置: export MIMO_API_KEY='your-api-key'")
    exit(1)

print("=" * 70)
print("MiMo TTS API Python SDK 测试")
print("=" * 70)
print(f"API Key: {api_key[:10]}****************")
print("=" * 70)

# 创建客户端
client = OpenAI(
    api_key=api_key,
    base_url="https://api.xiaomimimo.com/v1"
)

# 测试文本
text = "你好，这是一个语音合成测试！很高兴为你服务。"

print(f"\n测试文本: {text}")
print("\n尝试语音合成...")

try:
    completion = client.chat.completions.create(
        model="mimo-v2.5-tts",
        messages=[
            {
                "role": "user",
                "content": "用欢快、活泼的语气说话，语速稍快"
            },
            {
                "role": "assistant",
                "content": text
            }
        ],
        audio={
            "format": "mp3",
            "voice": "冰糖"
        }
    )
    
    message = completion.choices[0].message
    
    if hasattr(message, 'audio') and message.audio:
        audio_bytes = base64.b64decode(message.audio.data)
        with open("test-output.mp3", "wb") as f:
            f.write(audio_bytes)
        print("\n✅ 成功!")
        print(f"   音频大小: {len(audio_bytes)} bytes")
        print("   已保存为: test-output.mp3")
    else:
        print("\n⚠️ 响应中没有音频数据")
        print(f"   消息内容: {message}")
        
except Exception as e:
    print(f"\n❌ 错误: {e}")
    print("\n可能的解决方案:")
    print("   1. 检查 API Key 是否正确")
    print("   2. 确认 API Key 有语音合成权限")
    print("   3. 联系 MiMo 客服确认账号状态")

print("=" * 70)
