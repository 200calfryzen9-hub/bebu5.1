// あっせん伝票(せり購入伝票)のOCRテキストから子牛データを抽出するパーサー。
// 罫線入りの帳票はOCRでラベル文字自体が誤読されることが多いため、
// まずラベル近傍を探し、見つからなければ全文からパターンだけで拾うフォールバックを行う。

export interface ParsedReceipt {
  earTag?: string;
  birthDate?: string; // YYYY-MM-DD
  sex?: 'MALE' | 'FEMALE';
  weight?: number;
  price?: number; // 円
  auctionDate?: string; // YYYY-MM-DD
  fatherName?: string; // 本人(父)
  motherFatherName?: string; // 母の父
  motherMotherFatherName?: string; // 母の母の父
}

// iPhoneのLive Textや一部OCRは数字・記号を全角で返すことがあり、\dや半角記号の
// 正規表現に全く引っかからなくなるため、パース前に半角へ統一する。
function normalizeOcrText(text: string): string {
  return text
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/／/g, '/');
}

// ラベルの直後(改行含め最大80文字)から最初のパターンを探す。
// OCRはラベルの文字間に空白や改行を挟むことが多いため、ラベル自体も
// 文字間の空白/改行を許容する正規表現にして検索する。
function labelRegex(label: string): RegExp {
  const pattern = label.split('').map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
  return new RegExp(pattern);
}

function findAfterLabel(text: string, label: string, pattern: RegExp): string | undefined {
  const labelMatch = text.match(labelRegex(label));
  if (!labelMatch || labelMatch.index === undefined) return undefined;
  const windowStart = labelMatch.index + labelMatch[0].length;
  const window = text.slice(windowStart, windowStart + 80);
  const match = window.match(pattern);
  return match ? match[0] : undefined;
}

// findAfterLabelと同じだが、抽出した値をtextから取り除いた「残りの文字列」も返す。
// 「母の父」は「母の母の父」の末尾3文字と偶然一致してしまうため、先に長い方の
// ラベルと値を取り除いてから短い方を探さないと、母の母の父の値を母の父として
// 誤って拾ってしまう。
function extractAndConsume(text: string, label: string, pattern: RegExp): { value?: string; rest: string } {
  const labelMatch = text.match(labelRegex(label));
  if (!labelMatch || labelMatch.index === undefined) return { rest: text };
  const windowStart = labelMatch.index + labelMatch[0].length;
  const window = text.slice(windowStart, windowStart + 80);
  const match = window.match(pattern);
  if (!match || match.index === undefined) return { rest: text };
  const valueEnd = windowStart + match.index + match[0].length;
  const rest = text.slice(0, labelMatch.index) + text.slice(valueEnd);
  return { value: match[0], rest };
}

// 「07.10.28」「令和5年11月22日」「R5.11.22」などを YYYY-MM-DD に正規化
function normalizeDate(raw: string): string | undefined {
  const eraMatch = raw.match(/(令和|平成|昭和|R|H|S)\.?(\d{1,2})[年.](\d{1,2})[月.](\d{1,2})日?/);
  if (eraMatch) {
    const eraBase: Record<string, number> = { '令和': 2018, 'R': 2018, '平成': 1988, 'H': 1988, '昭和': 1925, 'S': 1925 };
    const base = eraBase[eraMatch[1]];
    const year = base + parseInt(eraMatch[2], 10);
    const month = eraMatch[3].padStart(2, '0');
    const day = eraMatch[4].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const numMatch = raw.match(/(\d{1,4})[.\-/,](\d{1,2})[.\-/,](\d{1,2})/);
  if (numMatch) {
    let year = parseInt(numMatch[1], 10);
    if (year < 100) {
      // 元号の文字が付かない1〜2桁年(例: 07.10.28, 08,8,17)は、
      // せり伝票では元号(令和)を省略した和暦表記のため、令和元年=2019を基準に変換する
      year = 2018 + year;
    }
    const month = numMatch[2].padStart(2, '0');
    const day = numMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

const EAR_TAG_PATTERN = /\d{4,5}[-‐ー]\d{3,4}[-‐ー]\d/;
// OCRでカンマが句点やピリオドに誤読され、しかも複数個並ぶことがあるため区切りは1文字以上許容する
const PRICE_PATTERN = /\d{2,3}[,.。\s]+\d{3}/;
// 開催日は「/」区切りが基本だが、OCRで「,」「.」に化けることもあるため両方許容する
const AUCTION_DATE_PATTERN = /\d{1,2}[/,.]\d{1,2}[/,.]\d{1,2}/;
const DOT_DATE_PATTERN = /\d{2}[.。]\d{2}[.。]\d{2}/;
const ERA_DATE_PATTERN = /(令和|平成|昭和|R|H|S)\.?\d{1,2}[年.]\d{1,2}[月.]\d{1,2}日?/;
// 種雄牛名は漢字(まれに片仮名)2〜8文字程度
const NAME_PATTERN = /[一-龠々ヶヵ]{2,8}/;
const AGE_DAYS_PATTERN = /\d{1,4}/;

export function parseAssenReceipt(rawText: string): ParsedReceipt {
  const text = normalizeOcrText(rawText);
  const result: ParsedReceipt = {};

  const earTagRaw = findAfterLabel(text, '耳標番号', EAR_TAG_PATTERN) || text.match(EAR_TAG_PATTERN)?.[0];
  if (earTagRaw) {
    // アプリ内の既存データはハイフンなしの数字のみで保存されているため合わせる
    result.earTag = earTagRaw.replace(/\D/g, '');
  }

  const auctionDateRaw = findAfterLabel(text, '開催日', AUCTION_DATE_PATTERN) || text.match(AUCTION_DATE_PATTERN)?.[0];
  if (auctionDateRaw) {
    result.auctionDate = normalizeDate(auctionDateRaw);
  }

  const birthDateRaw = findAfterLabel(text, '生年月日', ERA_DATE_PATTERN)
    || findAfterLabel(text, '生年月日', DOT_DATE_PATTERN)
    || text.match(ERA_DATE_PATTERN)?.[0]
    || text.match(DOT_DATE_PATTERN)?.[0];
  if (birthDateRaw) {
    result.birthDate = normalizeDate(birthDateRaw);
  }

  // 牡=種雄候補として残す牡牛、去=去勢(肥育用の去勢オス)。どちらもオスとして扱う
  if (/[牡去]/.test(text)) {
    result.sex = 'MALE';
  } else if (/牝/.test(text)) {
    result.sex = 'FEMALE';
  }

  const weightRaw = findAfterLabel(text, '体重', /\d{2,3}/);
  if (weightRaw) {
    result.weight = parseInt(weightRaw, 10);
  }

  const priceRaw = findAfterLabel(text, 'せり価格', PRICE_PATTERN) || text.match(PRICE_PATTERN)?.[0];
  if (priceRaw) {
    const num = parseInt(priceRaw.replace(/[,.。\s]/g, ''), 10);
    if (!isNaN(num)) result.price = num;
  }

  // 「母の父」は「母の母の父」の一部分にも一致してしまうため、必ず長いラベルから先に取り除く
  const mmf = extractAndConsume(text, '母の母の父', NAME_PATTERN);
  if (mmf.value) result.motherMotherFatherName = mmf.value;

  const mf = extractAndConsume(mmf.rest, '母の父', NAME_PATTERN);
  if (mf.value) result.motherFatherName = mf.value;

  const fatherNameRaw = findAfterLabel(mmf.rest, '本人', NAME_PATTERN);
  if (fatherNameRaw) result.fatherName = fatherNameRaw;

  // 生年月日が読み取れなかった場合、開催日と日齢から逆算する
  if (!result.birthDate && result.auctionDate) {
    const ageRaw = findAfterLabel(text, '日齢', AGE_DAYS_PATTERN);
    if (ageRaw) {
      const ageInDays = parseInt(ageRaw, 10);
      const auction = new Date(result.auctionDate);
      if (!isNaN(auction.getTime())) {
        auction.setDate(auction.getDate() - ageInDays);
        result.birthDate = auction.toISOString().slice(0, 10);
      }
    }
  }

  return result;
}
