---
name: "tts-mimo"
description: "调用小米MiMo TTS API进行语音合成。Invoke when user needs to convert text to speech, generate audio content, or synthesize voice using MiMo's speech synthesis service."
---

# MiMo 语音合成 (TTS)

这个Skill用于调用小米MiMo的语音合成API，将文本转换为自然流畅的语音。

## 核心功能

1. **预置音色合成** - 使用内置精品音色
2. **音色设计** - 通过文本描述定制音色
3. **音色克隆** - 基于音频样本复刻音色

## 支持的模型

| 模型名称 | Model ID | 功能说明 |
|---------|----------|----------|
| MiMo-V2.5-TTS | mimo-v2.5-tts | 预置音色合成，支持唱歌模式 |
| MiMo-V2.5-TTS-VoiceDesign | mimo-v2.5-tts-voicedesign | 文本描述设计音色 |
| MiMo-V2.5-TTS-VoiceClone | mimo-v2.5-tts-voiceclone | 音频样本复刻音色 |

## API 调用方式

### 使用 OpenAI SDK（推荐）

MiMo API兼容OpenAI SDK格式，**必须使用OpenAI SDK**，直接使用HTTP请求会失败。

#### Node.js 版本

```javascript
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.xiaomimimo.com/v1'
});

const completion = await client.chat.completions.create({
  model: 'mimo-v2.5-tts',
  messages: [
    {
      role: 'user',
      content: 'Bright, bouncy, slightly sing-song tone'
    },
    {
      role: 'assistant',
      content: 'Hey boss — guess what? I just got the results back!'
    }
  ],
  audio: {
    format: 'mp3',
    voice: 'Chloe'
  }
});

const audioData = completion.choices[0].message.audio.data;
const audioBuffer = Buffer.from(audioData, 'base64');
fs.writeFileSync('output.mp3', audioBuffer);
```

#### Python 版本

```python
import os
from openai import OpenAI
import base64

client = OpenAI(
    api_key=os.environ.get("MIMO_API_KEY"),
    base_url="https://api.xiaomimimo.com/v1"
)

completion = client.chat.completions.create(
    model="mimo-v2.5-tts",
    messages=[
        {
            "role": "user",
            "content": "Bright, bouncy, slightly sing-song tone"
        },
        {
            "role": "assistant",
            "content": "Hey boss — guess what? I just got the results back!"
        }
    ],
    audio={
        "format": "mp3",
        "voice": "Chloe"
    }
)

message = completion.choices[0].message
audio_bytes = base64.b64decode(message.audio.data)
with open("output.mp3", "wb") as f:
    f.write(audio_bytes)
```

### 完整 Node.js 使用示例

```javascript
const OpenAI = require('openai');
const fs = require('fs');

async function synthesizeSpeech(apiKey, text, options = {}) {
  const {
    model = 'mimo-v2.5-tts',
    voice = 'Chloe',
    format = 'mp3',
    style = ''
  } = options;

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.xiaomimimo.com/v1'
  });

  const messages = [];
  if (style) {
    messages.push({
      role: 'user',
      content: style
    });
  }
  messages.push({
    role: 'assistant',
    content: text
  });

  try {
    const completion = await client.chat.completions.create({
      model: model,
      messages: messages,
      audio: {
        format: format,
        voice: voice
      }
    });

    const message = completion.choices[0].message;
    
    if (message.audio && message.audio.data) {
      return message.audio.data; // base64 编码的音频数据
    } else {
      throw new Error('响应中没有音频数据');
    }
  } catch (error) {
    console.error('语音合成失败:', error.message);
    throw error;
  }
}

// 使用示例
(async () => {
  try {
    const audioBase64 = await synthesizeSpeech(
      'your-api-key',
      '你好，这是一个语音合成测试！',
      {
        voice: '冰糖',
        style: '用欢快活泼的语气说话'
      }
    );
    
    // 保存音频文件
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync('output.mp3', audioBuffer);
    console.log('音频已保存: output.mp3');
  } catch (error) {
    console.error('错误:', error);
  }
})();
```

### Express 后端示例

```javascript
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/tts', async (req, res) => {
  try {
    const { apiKey, text, style, voice } = req.body;
    
    if (!apiKey || !text) {
      return res.json({ success: false, message: '缺少必要参数' });
    }
    
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.xiaomimimo.com/v1'
    });
    
    const messages = [];
    if (style) {
      messages.push({ role: 'user', content: style });
    }
    messages.push({ role: 'assistant', content: text });
    
    const completion = await client.chat.completions.create({
      model: 'mimo-v2.5-tts',
      messages: messages,
      audio: {
        format: 'mp3',
        voice: voice || 'Chloe'
      }
    });
    
    const message = completion.choices[0].message;
    
    if (message.audio && message.audio.data) {
      return res.json({
        success: true,
        audioData: message.audio.data,
        format: 'mp3'
      });
    } else {
      return res.json({ success: false, message: '响应中没有音频数据' });
    }
  } catch (error) {
    console.error('语音合成失败:', error.message);
    return res.json({
      success: false,
      message: `合成失败: ${error.message}`
    });
  }
});

app.listen(5000, () => {
  console.log('MiMo TTS 服务器运行在 http://localhost:5000');
});
```

### 前端调用示例

```javascript
async function synthesizeSpeech(apiKey, text, voice = 'Chloe', style = '') {
  const response = await fetch('http://localhost:5000/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: apiKey,
      text: text,
      voice: voice,
      style: style
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  // 解码 base64 音频数据
  const audioBytes = Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0));
  const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  // 播放音频
  const audio = new Audio(audioUrl);
  await audio.play();
  
  return audioUrl;
}
```

## 风格控制方法

### 1. 自然语言控制
将风格描述放在 `role: user` 的 `content` 中：

```javascript
{
  role: 'user',
  content: 'Bright, bouncy, slightly sing-song tone — like you\'re bursting with good news.'
}
```

中文示例：
```javascript
{
  role: 'user',
  content: '用轻快上扬的语调，语速稍快，带着查到成绩后压抑不住的激动与小骄傲'
}
```

### 2. 导演模式（详细风格描述）

```javascript
{
  role: 'user',
  content: `角色：温柔知性的女大学生，中文系专业，喜欢阅读古典文学
场景：在图书馆安静角落，轻声为朋友讲解古诗词
指导：声音清澈柔和，语速适中偏慢，带有些许书卷气，咬字清晰优雅`
}
```

## 预置音色列表

**实际可用的音色**（根据API测试）：

| 音色名称 | 类型 | 说明 |
|---------|------|------|
| `mimo_default` | 通用 | 默认音色 |
| `冰糖` | 中文女声 | 甜美活泼 |
| `茉莉` | 中文女声 | 温柔知性 |
| `苏打` | 中文男声 | 阳光少年 |
| `白桦` | 中文男声 | 沉稳成熟 |
| `Mia` | 英文女声 | 活泼可爱 |
| `Chloe` | 英文女声 | 明亮女声 |
| `Milo` | 英文男声 | 年轻男声 |
| `Dean` | 英文男声 | 成熟男声 |

## 支持的音频格式

- `mp3` - MP3格式（推荐）
- `wav` - WAV格式
- `pcm` - PCM原始格式
- `opus` - Opus格式

## 安装依赖

```bash
# Node.js
npm install openai

# Python
pip install openai
```

## 重要提示

1. **必须使用 OpenAI SDK** - 直接使用 HTTP 请求（fetch/axios/https）会返回 "Not supported model" 错误
2. **API Key 从环境变量获取** - 建议设置 `MIMO_API_KEY` 环境变量
3. **音色选择** - 中文文本推荐使用 `冰糖`、`茉莉`、`苏打`、`白桦` 或 `mimo_default`
4. **风格控制** - 使用自然语言描述风格，放在 user 角色的消息中

## 错误处理

```javascript
try {
  const audioData = await synthesizeSpeech(apiKey, text, options);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('API Key 无效');
  } else if (error.message.includes('400')) {
    console.error('参数错误，请检查音色名称和格式');
  } else {
    console.error('语音合成失败:', error.message);
  }
}
```
