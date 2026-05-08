const OpenAI = require('openai');
const fs = require('fs');

// 从环境变量获取 API Key
const apiKey = process.env.MIMO_API_KEY;
const text = process.argv[2] || 'Hello, this is a test.';

if (!apiKey) {
  console.error('错误: 环境变量 MIMO_API_KEY 未设置');
  console.error('请设置环境变量: export MIMO_API_KEY="your-api-key"');
  process.exit(1);
}

console.log('='.repeat(70));
console.log('MiMo TTS API Node.js OpenAI SDK 测试');
console.log('='.repeat(70));
console.log('API Key:', apiKey.substring(0, 10) + '****************');
console.log('文本:', text);
console.log('='.repeat(70));

// 创建 OpenAI 客户端
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.xiaomimimo.com/v1'
});

async function synthesizeSpeech() {
  try {
    console.log('\n正在请求语音合成...');
    
    const completion = await client.chat.completions.create({
      model: 'mimo-v2.5-tts',
      messages: [
        {
          role: 'user',
          content: 'Bright, bouncy, slightly sing-song tone — like you are bursting with good news you can barely hold in. Fast pace, rising pitch at the end.'
        },
        {
          role: 'assistant',
          content: text
        }
      ],
      audio: {
        format: 'mp3',
        voice: 'Chloe'
      }
    });

    console.log('\n✅ 请求成功!');
    console.log('响应结构:', Object.keys(completion));
    
    const message = completion.choices[0].message;
    
    if (message.audio && message.audio.data) {
      const audioBuffer = Buffer.from(message.audio.data, 'base64');
      fs.writeFileSync('test-output.mp3', audioBuffer);
      console.log(`\n🎵 音频已保存: test-output.mp3`);
      console.log(`   大小: ${audioBuffer.length} bytes`);
    } else {
      console.log('\n⚠️ 响应中没有音频数据');
      console.log('消息内容:', JSON.stringify(message, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
  
  console.log('='.repeat(70));
}

synthesizeSpeech();
