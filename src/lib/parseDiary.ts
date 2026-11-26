export type Section = { date: string; title: string; body: string };

const DATE_RE = /^(\d{1,2})\/(\d{1,2})$/;

export function parseDiary(text: string, startYear: number): Section[] {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\uFFFC/g, '').split('\n');
  const out: Section[] = [];
  let year = startYear;
  let prevMonth = 0;
  let date: string | null = null;
  let block: string[] = [];

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
      if (month < prevMonth) year++; // 12月→1月で年を繰り上げ
      prevMonth = month;
      date = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    } else if (t === '') {
      flush();
    } else {
      block.push(line);
    }
  }
  flush();
  return out; // 最初の日付より前の行（タイトル等）は無視される
}