import { describe, expect, it } from 'vitest';
import {
  BAT_HAN,
  batHan,
  birthYearFortunes,
  branchRelations,
  cuuDieu,
  napAm,
  nominalAge,
  taiSuiConflicts,
  yearBranchIndex,
  yearCanChi,
} from './year-fortune';

/**
 * ngaydep.com, "Bảng sao hạn năm 2027" (https://ngaydep.com/xem-sao-chieu-menh-va-han-nien-nam-2027.html), read
 * 26/10/2026: birth year, then nam (sao, hạn), nữ (sao, hạn). The page spells Vân Hán "Vân Hớn".
 */
const NGAYDEP_2027: ReadonlyArray<readonly [number, string, string, string, string]> = [
  [1948, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1960, 'Thái Dương', 'Thiên La', 'Thổ Tú', 'Diêm Vương'],
  [1972, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [1984, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1996, 'Thái Dương', 'Toán Tận', 'Thổ Tú', 'Huỳnh Tuyền'],
  [2008, 'Thổ Tú', 'Tam Kheo', 'Vân Hán', 'Thiên Tinh'],
  [1949, 'Kế Đô', 'Diêm Vương', 'Thái Dương', 'Thiên La'],
  [1961, 'Thái Bạch', 'Toán Tận', 'Thái Âm', 'Huỳnh Tuyền'],
  [1973, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1985, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1997, 'Thái Bạch', 'Thiên Tinh', 'Thái Âm', 'Tam Kheo'],
  [2009, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1950, 'Vân Hán', 'Địa Võng', 'La Hầu', 'Địa Võng'],
  [1962, 'Thủy Diệu', 'Thiên Tinh', 'Mộc Đức', 'Tam Kheo'],
  [1974, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1986, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [1998, 'Thủy Diệu', 'Ngũ Mộ', 'Mộc Đức', 'Ngũ Mộ'],
  [2010, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1951, 'Thái Dương', 'Thiên La', 'Thổ Tú', 'Diêm Vương'],
  [1963, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [1975, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1987, 'Thái Dương', 'Toán Tận', 'Thổ Tú', 'Huỳnh Tuyền'],
  [1999, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [2011, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1952, 'Thái Bạch', 'Toán Tận', 'Thái Âm', 'Huỳnh Tuyền'],
  [1964, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1976, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1988, 'Thái Bạch', 'Thiên Tinh', 'Thái Âm', 'Tam Kheo'],
  [2000, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [2012, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1953, 'Thủy Diệu', 'Thiên Tinh', 'Mộc Đức', 'Tam Kheo'],
  [1965, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1977, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [1989, 'Thủy Diệu', 'Thiên Tinh', 'Mộc Đức', 'Tam Kheo'],
  [2001, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [2013, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [1954, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [1966, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1978, 'Thái Dương', 'Toán Tận', 'Thổ Tú', 'Huỳnh Tuyền'],
  [1990, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [2002, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [2014, 'Thái Dương', 'Toán Tận', 'Thổ Tú', 'Huỳnh Tuyền'],
  [1955, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1967, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1979, 'Thái Bạch', 'Toán Tận', 'Thái Âm', 'Huỳnh Tuyền'],
  [1991, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [2003, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [2015, 'Thái Bạch', 'Thiên Tinh', 'Thái Âm', 'Tam Kheo'],
  [1956, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1968, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [1980, 'Thủy Diệu', 'Thiên Tinh', 'Mộc Đức', 'Tam Kheo'],
  [1992, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [2004, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [2016, 'Thủy Diệu', 'Ngũ Mộ', 'Mộc Đức', 'Ngũ Mộ'],
  [1957, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [1969, 'Thái Dương', 'Thiên La', 'Thổ Tú', 'Diêm Vương'],
  [1981, 'Thổ Tú', 'Ngũ Mộ', 'Vân Hán', 'Ngũ Mộ'],
  [1993, 'Thái Âm', 'Diêm Vương', 'Thái Bạch', 'Thiên La'],
  [2005, 'Thái Dương', 'Toán Tận', 'Thổ Tú', 'Huỳnh Tuyền'],
  [1946, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1958, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1970, 'Thái Bạch', 'Toán Tận', 'Thái Âm', 'Huỳnh Tuyền'],
  [1982, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1994, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [2006, 'Thái Bạch', 'Thiên Tinh', 'Thái Âm', 'Tam Kheo'],
  [1947, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1959, 'Vân Hán', 'Địa Võng', 'La Hầu', 'Địa Võng'],
  [1971, 'Thủy Diệu', 'Thiên Tinh', 'Mộc Đức', 'Tam Kheo'],
  [1983, 'Mộc Đức', 'Huỳnh Tuyền', 'Thủy Diệu', 'Toán Tận'],
  [1995, 'Vân Hán', 'Thiên La', 'La Hầu', 'Diêm Vương'],
  [2007, 'Thủy Diệu', 'Ngũ Mộ', 'Mộc Đức', 'Ngũ Mộ'],
];

/**
 * Điện Máy Xanh, "Bảng tra cứu sao hạn năm 2026" (https://www.dienmayxanh.com/kinh-nghiem-hay/sao-chieu-menh-la-gi-bang-sao-han-chi-tiet-1588820),
 * read 26/10/2026; the rows of tuổi Tý and a few others (a different year from the table above).
 */
const DMX_2026: ReadonlyArray<readonly [number, string, string, string, string]> = [
  [1948, 'Kế Đô', 'Diêm Vương', 'Thái Dương', 'Thiên La'],
  [1960, 'Thái Bạch', 'Toán Tận', 'Thái Âm', 'Huỳnh Tuyền'],
  [1972, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1984, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [1996, 'Thái Bạch', 'Thiên Tinh', 'Thái Âm', 'Tam Kheo'],
  [2008, 'La Hầu', 'Tam Kheo', 'Kế Đô', 'Thiên Tinh'],
  [1997, 'Thủy Diệu', 'Ngũ Mộ', 'Mộc Đức', 'Ngũ Mộ'],
  [1966, 'Kế Đô', 'Địa Võng', 'Thái Dương', 'Địa Võng'],
  [2007, 'Thổ Tú', 'Tam Kheo', 'Vân Hán', 'Thiên Tinh'],
];

function expectTable(lunarYear: number, rows: typeof NGAYDEP_2027): void {
  for (const [birth, maleStar, maleHan, femaleStar, femaleHan] of rows) {
    const age = nominalAge(birth, lunarYear);
    expect({ birth, male: [cuuDieu(age, 'male'), batHan(age, 'male')], female: [cuuDieu(age, 'female'), batHan(age, 'female')] }).toEqual({
      birth,
      male: [maleStar, maleHan],
      female: [femaleStar, femaleHan],
    });
  }
}

describe('sao chiếu mệnh and hạn', () => {
  it('matches every row of the published 2027 table', () => {
    expect(NGAYDEP_2027).toHaveLength(71);
    expectTable(2027, NGAYDEP_2027);
  });

  it('matches a published 2026 table too', () => {
    expectTable(2026, DMX_2026);
  });

  it('matches the worked example of Báo Hà Tĩnh (48 tuổi: nam Thủy Diệu, nữ Mộc Đức)', () => {
    expect(cuuDieu(48, 'male')).toBe('Thủy Diệu');
    expect(cuuDieu(48, 'female')).toBe('Mộc Đức');
  });

  it('follows the counting examples of Báo La Văn Sử (58 tuổi: nam Toán Tận, nữ Huỳnh Tuyền; 51: nam Thiên La, nữ Diêm Vương)', () => {
    expect(batHan(58, 'male')).toBe('Toán Tận');
    expect(batHan(58, 'female')).toBe('Huỳnh Tuyền');
    expect(batHan(51, 'male')).toBe('Thiên La');
    expect(batHan(51, 'female')).toBe('Diêm Vương');
    // Men meet Huỳnh Tuyền at 18, 27, 36… 81, 89, 90, 98 (hoatieu.vn lists the same ages).
    for (const age of [18, 27, 36, 45, 54, 63, 72, 81, 89, 90, 98]) expect(batHan(age, 'male')).toBe('Huỳnh Tuyền');
  });

  it('gives nothing below 10 tuổi mụ and repeats every 9 (star) and covers all 8 hạn', () => {
    expect(cuuDieu(9, 'male')).toBeNull();
    expect(batHan(1, 'female')).toBeNull();
    for (let age = 10; age < 100; age++) expect(cuuDieu(age + 9, 'female')).toBe(cuuDieu(age, 'female'));
    expect(new Set(Array.from({ length: 80 }, (_, i) => batHan(10 + i, 'male')))).toEqual(new Set(BAT_HAN));
  });
});

describe('year names', () => {
  it('names the year and its nạp âm', () => {
    expect(yearCanChi(2027)).toBe('Đinh Mùi');
    expect(yearCanChi(2026)).toBe('Bính Ngọ');
    expect(yearCanChi(1984)).toBe('Giáp Tý');
    expect(yearBranchIndex(2027)).toBe(7);
    // Điện Máy Xanh "Năm 2027 là năm con gì": Đinh Mùi, Thiên Hà Thủy.
    expect(napAm(2027)).toEqual({ name: 'Thiên Hà Thủy', element: 'Thủy' });
    expect(napAm(2026)).toEqual({ name: 'Thiên Hà Thủy', element: 'Thủy' });
    expect(napAm(1984).name).toBe('Hải Trung Kim');
    expect(napAm(2000).name).toBe('Bạch Lạp Kim');
    expect(napAm(1983).name).toBe('Đại Hải Thủy');
  });
});

describe('branch relations', () => {
  it('lists the groups of tuổi Mùi as published (tam hợp Hợi Mão, tứ hành xung Thìn Tuất Sửu)', () => {
    expect(branchRelations(7)).toEqual({ tamHop: ['Hợi', 'Mão'], lucHop: 'Ngọ', lucXung: 'Sửu', tuHanhXung: ['Tuất', 'Sửu', 'Thìn'] });
    expect(branchRelations(0)).toEqual({ tamHop: ['Thìn', 'Thân'], lucHop: 'Sửu', lucXung: 'Ngọ', tuHanhXung: ['Mão', 'Ngọ', 'Dậu'] });
    expect(branchRelations(2).lucHop).toBe('Hợi');
    expect(branchRelations(9).lucHop).toBe('Thìn');
  });

  it('finds who meets Thái Tuế in a Mùi year: Mùi trực, Sửu xung and hình, Tuất hình and phá, Tý hại', () => {
    const conflicts = Array.from({ length: 12 }, (_, branch) => taiSuiConflicts(branch, 7));
    expect(conflicts).toEqual([['hai'], ['xung', 'hinh'], [], [], [], [], [], ['truc'], [], [], ['hinh', 'pha'], []]);
  });

  it('keeps the relations symmetric and counts tự hình only for Thìn, Ngọ, Dậu, Hợi', () => {
    for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) expect(taiSuiConflicts(a, b).filter((k) => k !== 'truc')).toEqual(taiSuiConflicts(b, a).filter((k) => k !== 'truc'));
    expect(taiSuiConflicts(6, 6)).toEqual(['truc', 'hinh']);
    expect(taiSuiConflicts(0, 3)).toEqual(['hinh']);
  });
});

describe('birthYearFortunes', () => {
  it('lists tuổi Tý born 1946 or later for 2027, oldest first', () => {
    const rows = birthYearFortunes(0, 2027, 1946);
    expect(rows.map((r) => r.birthLunarYear)).toEqual([1948, 1960, 1972, 1984, 1996, 2008, 2020]);
    expect(rows[3]).toEqual({ birthLunarYear: 1984, canChi: 'Giáp Tý', age: 44, male: { star: 'Thái Âm', han: 'Diêm Vương' }, female: { star: 'Thái Bạch', han: 'Thiên La' } });
    expect(rows[6]?.male).toEqual({ star: null, han: null });
  });

  it('includes a child born in the year itself', () => {
    expect(birthYearFortunes(7, 2027, 1946).map((r) => r.birthLunarYear)).toEqual([1955, 1967, 1979, 1991, 2003, 2015, 2027]);
  });
});
