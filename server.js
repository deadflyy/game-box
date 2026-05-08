const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

let db = null;

async function initDB() {
  const SQL = await initSqlJs();

  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,
    progress TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, game_name)
  )`);

  saveDB();
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// ========== 用户认证 API ==========

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: '请填写用户名和密码' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword]);
    saveDB();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.json({ success: true, message: '注册成功', userId: result[0].values[0][0] });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.json({ success: false, message: '用户名已存在' });
    }
    return res.json({ success: false, message: '注册失败' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: '请填写用户名和密码' });
  }

  try {
    const result = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({ success: false, message: '用户不存在' });
    }

    const user = result[0].values[0];
    const userId = user[0];
    const userName = user[1];
    const hashedPassword = user[2];

    if (!bcrypt.compareSync(password, hashedPassword)) {
      return res.json({ success: false, message: '密码错误' });
    }

    res.json({ success: true, message: '登录成功', userId, username: userName });
  } catch (err) {
    return res.json({ success: false, message: '登录失败' });
  }
});

// ========== 游戏进度 API ==========

app.get('/api/progress/:gameName', (req, res) => {
  const { gameName } = req.params;
  const userId = req.query.userId;

  if (!userId) {
    return res.json({ success: false, message: '请先登录' });
  }

  try {
    const result = db.exec(`SELECT * FROM game_progress WHERE user_id = ${userId} AND game_name = '${gameName}'`);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({ success: true, progress: null });
    }

    const progress = result[0].values[0];
    res.json({ success: true, progress: { level: progress[3], score: progress[4], progress: progress[5] } });
  } catch (err) {
    return res.json({ success: false, message: '获取进度失败' });
  }
});

app.post('/api/progress/:gameName', (req, res) => {
  const { gameName } = req.params;
  const { userId, level, score, progress } = req.body;

  if (!userId) {
    return res.json({ success: false, message: '请先登录' });
  }

  try {
    db.run(`INSERT OR REPLACE INTO game_progress (user_id, game_name, level, score, progress, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId, gameName, level || 1, score || 0, JSON.stringify(progress || {})]);
    saveDB();
    res.json({ success: true, message: '进度已保存' });
  } catch (err) {
    return res.json({ success: false, message: '保存进度失败' });
  }
});

// ========== TTS 语音合成 API ==========

app.post('/api/tts', async (req, res) => {
  try {
    const { apiKey, text, style, voice } = req.body;

    if (!apiKey || !text) {
      return res.json({
        success: false,
        message: '缺少必要参数'
      });
    }

    console.log(`[TTS] 请求: text=${text.substring(0, 30)}..., voice=${voice}`);

    // 创建 OpenAI 客户端
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.xiaomimimo.com/v1'
    });

    // 构建消息
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

    // 调用 MiMo TTS API
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
      console.log(`[TTS] 成功，音频长度: ${message.audio.data.length}`);

      return res.json({
        success: true,
        audioData: message.audio.data,
        format: 'mp3'
      });
    } else {
      return res.json({
        success: false,
        message: '响应中没有音频数据'
      });
    }

  } catch (error) {
    console.error('[TTS] 失败:', error.message);

    // 处理特定错误
    if (error.message.includes('401') || error.message.includes('Invalid API Key')) {
      return res.json({
        success: false,
        message: '无效的API Key，请检查您的API密钥',
        code: 401
      });
    } else if (error.message.includes('400') || error.message.includes('Param Incorrect')) {
      return res.json({
        success: false,
        message: '参数错误，请检查输入内容',
        code: 400,
        details: error.message
      });
    }

    return res.json({
      success: false,
      message: `合成失败: ${error.message}`,
      code: 500
    });
  }
});

// 启动服务器
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`API 端点:`);
    console.log(`  - POST /api/register     用户注册`);
    console.log(`  - POST /api/login        用户登录`);
    console.log(`  - GET  /api/progress/:gameName  获取游戏进度`);
    console.log(`  - POST /api/progress/:gameName  保存游戏进度`);
    console.log(`  - POST /api/tts          语音合成`);
  });
});
