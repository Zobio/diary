import { useState, useEffect } from 'react';

interface DiaryFilterProps {
  categories: string[];
}

const STORAGE_KEY = 'diary-filter-excluded';

// URLパラメータから除外カテゴリを読み込む
function getExcludedFromURL(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const params = new URLSearchParams(window.location.search);
  const exclude = params.get('exclude');
  return exclude ? new Set(exclude.split(',')) : new Set();
}

// localStorageから除外カテゴリを読み込む
function getExcludedFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// localStorageに除外カテゴリを保存
function saveExcludedToStorage(excluded: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...excluded]));
  } catch {
    // localStorageが使えない環境では無視
  }
}

// URLパラメータを更新
function updateURL(excluded: Set<string>) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);

  if (excluded.size > 0) {
    params.set('exclude', [...excluded].join(','));
  } else {
    params.delete('exclude');
  }

  const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  window.history.replaceState({}, '', newURL);
}

export default function DiaryFilter({ categories }: DiaryFilterProps) {
  const allCategories = categories.filter(c => c !== 'その他');

  // 初期値：URLパラメータ → localStorage → デフォルト（全選択）
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(() => {
    const urlExcluded = getExcludedFromURL();
    if (urlExcluded.size > 0) return urlExcluded;
    return getExcludedFromStorage();
  });

  const [isOpen, setIsOpen] = useState(false);

  // 表示するカテゴリ（除外されていないもの）
  const includedCategories = new Set(allCategories.filter(c => !excludedCategories.has(c)));

  // フィルタを適用
  useEffect(() => {
    const sections = document.querySelectorAll('section[data-category]');
    const articles = document.querySelectorAll('article[data-date]');

    sections.forEach((section) => {
      const category = section.getAttribute('data-category');
      // 除外カテゴリを非表示
      if (category && excludedCategories.has(category)) {
        (section as HTMLElement).style.display = 'none';
      } else {
        (section as HTMLElement).style.display = 'block';
      }
    });

    // 全ての節が非表示の日は、日付ごと非表示にする
    articles.forEach((article) => {
      const visibleSections = article.querySelectorAll('section[data-category]:not([style*="display: none"])');
      if (visibleSections.length === 0) {
        (article as HTMLElement).style.display = 'none';
      } else {
        (article as HTMLElement).style.display = 'block';
      }
    });
  }, [excludedCategories]);

  // 除外カテゴリが変更されたら、URLとlocalStorageを更新
  useEffect(() => {
    updateURL(excludedCategories);
    saveExcludedToStorage(excludedCategories);
  }, [excludedCategories]);

  const toggleCategory = (category: string) => {
    const newExcluded = new Set(excludedCategories);
    if (newExcluded.has(category)) {
      newExcluded.delete(category);
    } else {
      newExcluded.add(category);
    }
    setExcludedCategories(newExcluded);
  };

  const selectAll = () => {
    setExcludedCategories(new Set());
  };

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      backgroundColor: '#fff',
      padding: '12px',
      borderBottom: '1px solid #ddd',
      zIndex: 100,
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            border: '1px solid #333',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          {isOpen ? '▲' : '▼'} フィルタ {excludedCategories.size > 0 && `(${excludedCategories.size}件非表示)`}
        </button>
        {excludedCategories.size > 0 && (
          <button
            onClick={selectAll}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #999',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            全て表示
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          {allCategories.map((category) => (
            <label
              key={category}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: includedCategories.has(category) ? '#fff' : '#f0f0f0',
                cursor: 'pointer',
                fontSize: '14px',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={includedCategories.has(category)}
                onChange={() => toggleCategory(category)}
                style={{ marginRight: '6px', cursor: 'pointer' }}
              />
              <span style={{ textDecoration: includedCategories.has(category) ? 'none' : 'line-through' }}>
                {category}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
