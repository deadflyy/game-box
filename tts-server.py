#!/usr/bin/env python3
import os
import sys
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from openai import OpenAI
except ImportError:
    print("请先安装openai库: pip install openai")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

@app.route('/api/tts', methods=['POST'])
def tts():
    try:
        data = request.get_json()
        
        api_key = data.get('apiKey')
        text = data.get('text')
        style = data.get('style', '')
        voice = data.get('voice', 'Chloe')
        
        if not api_key or not text:
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            })
        
        print(f"收到TTS请求: text={text[:30]}..., style={style}, voice={voice}")
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.xiaomimimo.com/v1"
        )
        
        messages = []
        if style:
            messages.append({
                "role": "user",
                "content": style
            })
        messages.append({
            "role": "assistant",
            "content": text
        })
        
        completion = client.chat.completions.create(
            model="mimo-v2.5-tts",
            messages=messages,
            audio={
                "format": "mp3",
                "voice": voice
            }
        )
        
        message = completion.choices[0].message
        audio_data = message.audio.data
        
        print(f"语音合成成功，音频数据长度: {len(audio_data)}")
        
        return jsonify({
            'success': True,
            'audioData': audio_data,
            'format': 'mp3'
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"语音合成失败: {error_msg}")
        
        # 提取具体错误信息
        if "Invalid API Key" in error_msg or "401" in error_msg:
            return jsonify({
                'success': False,
                'message': '无效的API Key，请检查您的API密钥',
                'code': 401
            })
        elif "Param Incorrect" in error_msg or "400" in error_msg:
            return jsonify({
                'success': False,
                'message': '参数错误，请检查输入内容',
                'code': 400
            })
        
        return jsonify({
            'success': False,
            'message': f'合成失败: {error_msg}',
            'code': 500
        })

if __name__ == '__main__':
    print("启动MiMo TTS Python服务器...")
    print("访问地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
