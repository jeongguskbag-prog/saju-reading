// Minimal typings for the parts of lunar-javascript this app uses.
declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar;
    static fromYmd(y: number, m: number, d: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getLunar(): Lunar;
    toYmd(): string;
    toYmdHms(): string;
  }

  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar;
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): Solar;
    getEightChar(): EightChar;
    getJieQiTable(): Record<string, Solar>;
    getPrevJie(wholeDay?: boolean): JieQi;
    getNextJie(wholeDay?: boolean): JieQi;
  }

  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  export class LunarYear {
    static fromYear(y: number): LunarYear;
    getLeapMonth(): number;
  }

  export class LunarMonth {
    static fromYm(y: number, m: number): LunarMonth | null;
    getDayCount(): number;
  }

  export class EightChar {
    setSect(sect: 1 | 2): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYun(gender: 0 | 1, sect?: 1 | 2): Yun;
  }

  export class Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    isForward(): boolean;
    getStartSolar(): Solar;
    getDaYun(n?: number): DaYun[];
  }

  export class DaYun {
    getIndex(): number;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
  }
}
