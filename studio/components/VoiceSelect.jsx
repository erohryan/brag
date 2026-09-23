'use client';

// A <select> of all voices grouped by language via <optgroup>.
export default function VoiceSelect({ voices, value, onChange, id }) {
  const order = [];
  const byLang = new Map();
  for (const v of voices) {
    if (!byLang.has(v.lang)) {
      byLang.set(v.lang, []);
      order.push({ lang: v.lang, order: v.langOrder ?? 99 });
    }
    byLang.get(v.lang).push(v);
  }
  order.sort((a, b) => a.order - b.order);

  return (
    <select id={id} value={value} onChange={onChange}>
      {order.map((g) => (
        <optgroup key={g.lang} label={g.lang}>
          {byLang.get(g.lang).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.gender})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
