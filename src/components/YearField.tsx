"use client";

const FIRST_YEAR = 1900;

/** 네 자리 숫자만 입력되는 연도 칸 + 스크롤해서 고르는 연도 목록(▼). */
export default function YearField({ value, onChange }: { value: string; onChange: (year: string) => void }) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, i) => String(thisYear - i));
  const inList = years.includes(value);

  return (
    <div className="year-field">
      <input
        aria-label="년"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        placeholder="1990"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        required
      />
      <svg className="year-chevron" aria-hidden width="14" height="14" viewBox="0 0 14 14">
        <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        aria-label="연도 목록에서 선택"
        className="year-picker"
        value={inList ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="" disabled>연도 선택</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
    </div>
  );
}
