#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIARY_DIR = join(ROOT, 'src/diary');
const CATEGORIES_FILE = join(ROOT, 'categories.json');

// カテゴリリスト
const CATEGORIES = [
  '大学',
  '技術',
  'サークル',
  'エンタメ',
  '散歩・観光',
  '友人・交流',
  '体調・健康',
  '労働',
  '生活・金銭',
  '思索',
  'その他'
];

// キーワードルール
const KEYWORD_RULES = {
  '大学': {
    keywords: ['授業', '課題', 'COJT', '論理回路', '統計学', '科目A', '科目B', '実験', 'レポート', 'Arduino', 'ブレッドボード', '配線', '回路', '立ち会い検査', '担当教員'],
    priority: 5
  },
  '技術': {
    keywords: ['競プロ', 'ABC', 'AHC', 'AtCoder', 'rating', 'パフォ', '作問', 'アルゴリズム', 'プログラミング', 'コード', 'BIT', 'セグ木', '座圧', '累積和', 'ITF.PC', 'コンテスト', '解法', '順位'],
    priority: 10
  },
  'サークル': {
    keywords: ['サークル', '演奏', '合奏', '練習', 'セク練', 'ミーティング', 'TPC', 'ピアノソロ', 'メトロノーム', '運指'],
    priority: 8
  },
  'エンタメ': {
    keywords: ['映画', 'アニメ', 'ゴジラ', 'PSYCHO-PASS', '劇場版', 'ギルティクラウン', '展示', '上映', 'カバネリ', '魔法使いの夜', '聲の形', 'エッジランナーズ', 'IMAX', 'ドルビーシネマ'],
    priority: 7
  },
  '散歩・観光': {
    keywords: ['散歩', '浅草', '銀座', '六本木', '豊洲', '駒場祭', '三田祭', '学園祭', 'ららぽーと', 'ゆりかもめ', '東京スカイツリー', '秋葉原', '新橋', '日比谷', '品川', '大宮', 'レンタルサイクル', '街並み'],
    priority: 7
  },
  '友人・交流': {
    keywords: ['友人', '友達', '同期', '恋バナ', '雑談', '鍋', '実験協力', '飲み', 'カラオケ', '食事', 'ラーメン', '二郎', 'カップ麺'],
    priority: 6
  },
  '体調・健康': {
    keywords: ['体調', '喉が痛い', '疲れ', '睡眠', '布団', '寝落ち', '熱', '病気', '疲労', 'HP', '休んで', '調子'],
    priority: 9
  },
  '労働': {
    keywords: ['バイト', 'ES', 'エントリーシート', '就活', '面接', '募集', '応募', 'パソコン業務', '開発支援プログラム'],
    priority: 7
  },
  '生活・金銭': {
    keywords: ['物件', '入居', '貯金', '金欠', '残高', '宅通', '引っ越し', 'スーパー', '食費', '不動産', 'ジュース', '交通費', '運賃'],
    priority: 6
  },
  '思索': {
    keywords: ['考え', '思い', '人生', '価値観', '哲学', '心理', '感情', '意地', '証明', '上昇志向', 'レーティング中毒', '行動量最大化', '自分の機嫌'],
    priority: 5
  },
  'その他': {
    keywords: [],
    priority: 0
  }
};

// parseDiary.ts の内容を移植
const DATE_RE = /^(\d{1,2})\/(\d{1,2})$/;

function parseDiary(text, startYear) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\uFFFC/g, '').split('\n');
  const out = [];
  let year = startYear;
  let prevMonth = 0;
  let date = null;
  let block = [];

  const flush = () => {
    if (date && block.length > 0) {
      const [title, ...body] = block;
      out.push({ date, title: title.trim(), body: body.join('\n').trim() });
    }
    block = [];
  };

  for (const line of lines) {
    const t = line.trim();
    const m = t.match(DATE_RE);
    if (m) {
      flush();
      const month = Number(m[1]);
      if (month < prevMonth) year++;
      prevMonth = month;
      date = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    } else if (t === '') {
      flush();
    } else {
      block.push(line);
    }
  }
  flush();
  return out;
}

// ハッシュ生成
function hashSection(section) {
  const content = `${section.title}\n${section.body}`;
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

// categories.jsonの読み込み・初期化
function loadCategories() {
  try {
    const data = readFileSync(CATEGORIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      version: 1,
      categories: CATEGORIES,
      classifications: {}
    };
  }
}

// categories.jsonの保存
function saveCategories(data) {
  writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// キーワードベースで分類
function classifySection(section) {
  const text = `${section.title}\n${section.body}`;
  const scores = {};

  // 各カテゴリのスコアを計算
  for (const [category, rule] of Object.entries(KEYWORD_RULES)) {
    if (category === 'その他') continue;

    let matchCount = 0;
    const matchedKeywords = [];

    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }

    if (matchCount > 0) {
      scores[category] = matchCount * rule.priority;
      // デバッグ用：マッチしたキーワードを表示
      if (matchedKeywords.length > 0) {
        console.log(`    [${category}] ${matchedKeywords.join(', ')} (score: ${scores[category]})`);
      }
    }
  }

  // 最高スコアのカテゴリを選択
  let bestCategory = 'その他';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// メイン処理
function main() {
  // 既存の分類結果をロード
  const data = loadCategories();
  let newClassifications = 0;
  let updated = 0;

  // 全ての日記ファイルを読み込み
  const files = readdirSync(DIARY_DIR).filter(f => f.endsWith('.txt'));

  for (const file of files) {
    const path = join(DIARY_DIR, file);
    const text = readFileSync(path, 'utf8');
    const year = Number(file.match(/(\d{4})/)?.[1] || 2026);
    const sections = parseDiary(text, year);

    for (const section of sections) {
      const hash = hashSection(section);

      // 既に分類済みならスキップ
      if (data.classifications[hash]) {
        continue;
      }

      // キーワードベースで分類
      console.log(`Classifying: ${section.date} - ${section.title}`);
      const category = classifySection(section);
      data.classifications[hash] = category;
      newClassifications++;

      console.log(`  → ${category}\n`);
    }
  }

  // 結果を保存
  saveCategories(data);
  console.log(`\nDone! ${newClassifications} new classifications added.`);
  console.log(`Total classifications: ${Object.keys(data.classifications).length}`);
}

main();
