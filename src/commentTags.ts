/** 観点名ごとのコメントタグ候補。自由記述の代わりにタップで選べるようにする。 */
const COMMENT_TAGS_BY_ITEM: Record<string, string[]> = {
  主体性: ['自分から動けた', '新しいことに挑戦した', '指示を待ってしまった'],
  協働: ['連携がうまくいった', '仲間を助けた', '一人で抱え込んでしまった'],
  思考力: ['状況を分析できた', '冷静に考えられた', '判断が遅れた'],
  '声かけ/コミュニケーション': ['声かけができた', '伝え方を工夫した', '無言になってしまった'],
  状況判断: ['流れを読めた', '早めに動けた', '判断が遅れた'],
  役割遂行: ['役割を果たせた', '最後までやり切った', '途中で諦めそうになった'],
};

/** 観点名が候補一覧にない場合（生徒が独自に追加した観点など）に使う共通タグ。 */
const DEFAULT_COMMENT_TAGS = ['よくできた', 'もう少しだった', '焦ってしまった', '次は頑張りたい'];

export function tagsForItem(itemName: string): string[] {
  return COMMENT_TAGS_BY_ITEM[itemName] ?? DEFAULT_COMMENT_TAGS;
}

/** 選択したタグと任意の一言メモを、既存のcommentフィールド用の1本の文字列にまとめる。 */
export function composeComment(tags: string[], note: string): string | undefined {
  const parts = [...tags];
  if (note.trim()) parts.push(note.trim());
  return parts.length > 0 ? parts.join('、') : undefined;
}
