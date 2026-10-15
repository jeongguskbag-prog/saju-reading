import { SECTION_KEYS, SECTION_TITLES, type Reading } from "@/lib/reading-shared";

export default function ReadingView({ reading }: { reading: Reading }) {
  return (
    <section className="card reading">
      <h2>항목별 풀이</h2>
      <p className="summary">{reading.summary}</p>
      {SECTION_KEYS.map((key) => {
        const section = reading[key];
        return (
          <article key={key} className="section">
            <h3>{SECTION_TITLES[key]}</h3>
            {section.body.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
            {section.tips.length > 0 && (
              <ul className="tips" aria-label="실천 팁">
                {section.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
