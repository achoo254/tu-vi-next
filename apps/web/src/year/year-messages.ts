/**
 * Words of the yearly pages, in Vietnamese and English. They live with the pages (loaded on demand), not in
 * the main dictionary. The names of the art (sao, hạn, can chi, Thái Tuế) stay Vietnamese in both, and the
 * notes on each sao and hạn are worded as gentle reminders: the app's tone is balanced and never alarming.
 */
import type { BatHan, CuuDieu, TaiSuiKind } from '@tuvi/chart/year';
import type { Locale } from '../i18n/i18n';

const vi = {
  breadcrumb: 'Tử vi {year}',
  indexTitle: 'Tử vi {year} {canChi} cho 12 con giáp',
  indexLead:
    'Năm {canChi} theo âm lịch Việt Nam: ngày Tết, mệnh của năm, tuổi nào gặp Thái Tuế, và sao chiếu mệnh, vận hạn của từng năm sinh. Chọn con giáp của bạn để xem chi tiết.',
  signTitle: 'Tử vi {year} tuổi {branch} ({animal})',
  signLead:
    'Năm {canChi} của người tuổi {branch}: các tuổi hợp và xung, quan hệ với Thái Tuế, sao chiếu mệnh và hạn theo từng năm sinh, nam và nữ.',
  headIndexTitle: 'Tử vi {year} {canChi}: sao hạn, Thái Tuế của 12 con giáp',
  headIndexDescription:
    'Năm {year} {canChi}, mệnh {napAm}, Tết ngày {tet}: sao chiếu mệnh, vận hạn, tam hợp và tuổi phạm Thái Tuế của 12 con giáp, tính theo âm lịch Việt Nam.',
  headSignTitle: 'Tử vi {year} tuổi {branch} ({animal}): sao hạn, tam hợp, Thái Tuế',
  headSignDescription:
    'Tuổi {branch} năm {canChi} {year}: sao chiếu mệnh và hạn của người sinh năm {births}, nam và nữ; tam hợp, lục hợp, xung, Thái Tuế; Tết ngày {tet}.',

  yearTitle: 'Năm {year} âm lịch',
  yearCanChi: 'Can chi',
  yearAnimal: 'Con giáp',
  yearNapAm: 'Mệnh của năm (nạp âm)',
  yearTet: 'Mùng 1 Tết',
  yearSpan: 'Năm âm lịch kéo dài',
  yearSpanValue: '{from} đến {to}',
  yearLeap: 'Tháng nhuận',
  yearLeapNone: 'Không có tháng nhuận',
  yearLeapMonth: 'Tháng {month} nhuận',
  yearCalendarNote: 'Ngày tháng tính theo âm lịch Việt Nam (giờ UTC+7), cùng cách tính với phần lập lá số.',

  relationsTitle: 'Tuổi hợp và tuổi xung của tuổi {branch}',
  tamHop: 'Tam hợp',
  lucHop: 'Lục hợp',
  lucXung: 'Lục xung',
  tuHanhXung: 'Tứ hành xung',
  relationsNote: 'Hợp và xung là cách xếp nhóm 12 địa chi của văn hoá dân gian, để tham khảo, không quyết định chuyện hợp hay không của hai người.',

  taiSuiTitle: 'Thái Tuế năm {year}',
  taiSuiNone: 'Theo năm cách tính (trực, xung, hình, hại, phá), tuổi {branch} không gặp Thái Tuế năm {canChi}.',
  taiSuiSome:
    'Theo quan niệm dân gian, năm {canChi} tuổi {branch} {kinds}. Đây là lời nhắc để chủ động sắp xếp kế hoạch và giữ nhịp sống ổn định, không phải điều đáng lo.',
  taiSuiRules:
    'Cách tính: trực là cùng chi với năm; xung là lục xung (chi đối diện); hình là tam hình Dần–Tỵ–Thân, Sửu–Tuất–Mùi, Tý–Mão và tự hình Thìn, Ngọ, Dậu, Hợi; hại là lục hại; phá là lục phá.',
  taiSuiTable: 'Các tuổi gặp Thái Tuế năm {canChi}',
  taiSuiColumnBranch: 'Tuổi',
  taiSuiColumnKinds: 'Gặp Thái Tuế theo',

  fortuneTitle: 'Sao chiếu mệnh và vận hạn {year} của tuổi {branch}',
  fortuneColumnBirth: 'Năm sinh',
  fortuneColumnAge: 'Tuổi mụ',
  fortuneColumnMale: 'Nam',
  fortuneColumnFemale: 'Nữ',
  fortuneUnder10: 'chưa tính',
  fortuneNote:
    'Tuổi mụ là năm {year} trừ năm sinh âm lịch cộng một. Sinh trước Tết thì tính theo năm âm lịch trước đó (ví dụ sinh tháng 1/1985 trước ngày 21/1 là tuổi Giáp Tý). Bảng truyền thống tính sao, hạn từ 10 tuổi mụ.',
  fortuneGlossary: 'Lưu ý ngắn của từng sao và hạn trong bảng',
  starLabel: 'Sao {name}',
  hanLabel: 'Hạn {name}',

  interpretationTitle: 'Luận giải tuổi {branch} năm {year}',
  videoTitle: 'Video tử vi {year} tuổi {branch}',
  videoDescription: 'Video ngắn tóm tắt vận năm {year} {canChi} của người tuổi {branch}: điểm mạnh, công việc, tiền bạc và lời khuyên.',
  videoNote: 'Video có phụ đề, xem được khi tắt tiếng. Hình và giọng đọc do AI tạo.',
  'section.overview': 'Tổng quan',
  'section.career': 'Công việc',
  'section.money': 'Tài chính',
  'section.love': 'Tình cảm, gia đình',
  'section.health': 'Sức khỏe',
  'section.advice': 'Lời khuyên',

  disclaimer: 'Sao hạn, Thái Tuế, hợp xung là quan niệm dân gian, mang tính giải trí, tham khảo.',
  castCta: 'Lập lá số của bạn để xem lưu niên {year} trên 12 cung',
  otherSigns: 'Tuổi khác',
  signCard: 'Tuổi {branch}',
  sources: 'Nguồn bảng tra: sao Cửu Diệu và Bát Hạn theo cách đếm của Báo Hà Tĩnh và Báo La Văn Sử, đối chiếu đủ 71 năm sinh trong bảng năm 2027 của ngaydep.com; quan hệ địa chi theo boi.vn và 4T Human.',
} as const;

export type YearMessageKey = keyof typeof vi;

const en: Record<YearMessageKey, string> = {
  breadcrumb: '{year} by zodiac',
  indexTitle: 'The {year} {canChi} year for the 12 zodiac animals',
  indexLead:
    'The {canChi} year in the Vietnamese lunar calendar: Tết, the year’s element, who meets Thái Tuế, and the guiding star and limit (sao hạn) of each birth year. Pick your animal for the details.',
  signTitle: '{year} for the {branch} year ({animal})',
  signLead:
    'The {canChi} year for people born in a {branch} year: friendly and clashing signs, Thái Tuế, and the guiding star and limit of each birth year, for men and women.',
  headIndexTitle: 'Tử vi {year} {canChi}: sao hạn, Thái Tuế của 12 con giáp',
  headIndexDescription: '{year} {canChi}, element {napAm}, Tết on {tet}: guiding stars, limits, harmonies and Thái Tuế for the 12 zodiac animals.',
  headSignTitle: '{year} for the {branch} year ({animal}): sao hạn, harmonies, Thái Tuế',
  headSignDescription: 'The {branch} year in {canChi} {year}: guiding star and limit for people born in {births}, men and women; harmonies, clashes, Thái Tuế; Tết on {tet}.',

  yearTitle: 'The lunar year {year}',
  yearCanChi: 'Can chi',
  yearAnimal: 'Animal',
  yearNapAm: 'Element of the year (nạp âm)',
  yearTet: 'Tết (first day)',
  yearSpan: 'The lunar year runs',
  yearSpanValue: 'from {from} to {to}',
  yearLeap: 'Leap month',
  yearLeapNone: 'No leap month',
  yearLeapMonth: 'Leap month {month}',
  yearCalendarNote: 'Dates follow the Vietnamese lunar calendar (UTC+7), as the chart does.',

  relationsTitle: 'Friendly and clashing signs of the {branch} year',
  tamHop: 'Tam hợp (triple harmony)',
  lucHop: 'Lục hợp (pair harmony)',
  lucXung: 'Lục xung (opposite)',
  tuHanhXung: 'Tứ hành xung (four clashes)',
  relationsNote: 'Harmonies and clashes are folk groupings of the 12 branches: a reference, not a verdict on any two people.',

  taiSuiTitle: 'Thái Tuế in {year}',
  taiSuiNone: 'By the five relations (trực, xung, hình, hại, phá), the {branch} year does not meet Thái Tuế in {canChi}.',
  taiSuiSome: 'In folk belief, in {canChi} the {branch} year {kinds}. Take it as a reminder to plan ahead and keep a steady pace, not as something to worry about.',
  taiSuiRules:
    'Rules: trực is the same branch as the year; xung is the opposite branch; hình is the punishments Dần–Tỵ–Thân, Sửu–Tuất–Mùi, Tý–Mão and the self-punishment of Thìn, Ngọ, Dậu, Hợi; hại is lục hại; phá is lục phá.',
  taiSuiTable: 'Who meets Thái Tuế in {canChi}',
  taiSuiColumnBranch: 'Sign',
  taiSuiColumnKinds: 'Relation',

  fortuneTitle: 'Guiding star and limit in {year} for the {branch} year',
  fortuneColumnBirth: 'Born',
  fortuneColumnAge: 'Age (tuổi mụ)',
  fortuneColumnMale: 'Men',
  fortuneColumnFemale: 'Women',
  fortuneUnder10: 'not counted',
  fortuneNote:
    'Tuổi mụ is {year} minus the lunar birth year, plus one. Born before Tết counts as the previous lunar year (born in January 1985 before the 21st is Giáp Tý). The traditional tables start at tuổi mụ 10.',
  fortuneGlossary: 'A short note on each star and limit in the table',
  starLabel: 'Sao {name}',
  hanLabel: 'Hạn {name}',

  interpretationTitle: 'The {branch} year in {year}',
  videoTitle: '{year} horoscope video for {branch}',
  videoDescription: 'A short video on the {year} {canChi} year for people born in a {branch} year: strengths, work, money and advice.',
  videoNote: 'The video is in Vietnamese with burned-in subtitles, so it works muted. Pictures and voice are AI-generated.',
  'section.overview': 'Overview',
  'section.career': 'Work',
  'section.money': 'Money',
  'section.love': 'Love and family',
  'section.health': 'Health',
  'section.advice': 'Advice',

  disclaimer: 'Sao hạn, Thái Tuế, harmonies and clashes are folk beliefs, for entertainment and reference only.',
  castCta: 'Cast your chart to see {year} on the 12 palaces',
  otherSigns: 'Other signs',
  signCard: '{branch} year',
  sources:
    'Table sources: Cửu Diệu and Bát Hạn counted as in Báo Hà Tĩnh and Báo La Văn Sử, checked against all 71 birth years of the 2027 table on ngaydep.com; branch relations after boi.vn and 4T Human.',
};

export const YEAR_MESSAGES: Record<Locale, Record<YearMessageKey, string>> = { vi, en };

const TAI_SUI_VI: Record<TaiSuiKind, string> = {
  truc: 'trực Thái Tuế (cùng chi với năm)',
  xung: 'xung Thái Tuế',
  hinh: 'hình Thái Tuế',
  hai: 'hại Thái Tuế',
  pha: 'phá Thái Tuế',
};
const TAI_SUI_EN: Record<TaiSuiKind, string> = {
  truc: 'is trực Thái Tuế (same branch as the year)',
  xung: 'is xung Thái Tuế (opposite)',
  hinh: 'is hình Thái Tuế (punishment)',
  hai: 'is hại Thái Tuế (harm)',
  pha: 'is phá Thái Tuế (break)',
};
export const TAI_SUI_TERMS: Record<Locale, Record<TaiSuiKind, string>> = { vi: TAI_SUI_VI, en: TAI_SUI_EN };
/** The bare Vietnamese name of each relation, for tables. */
export const TAI_SUI_SHORT: Record<TaiSuiKind, string> = { truc: 'Trực', xung: 'Xung', hinh: 'Hình', hai: 'Hại', pha: 'Phá' };

/** One gentle reminder per star (Cửu Diệu), never a prediction. */
export const STAR_NOTES: Record<Locale, Record<CuuDieu, string>> = {
  vi: {
    'La Hầu': 'Nói năng mềm mỏng, đọc kỹ giấy tờ trước khi ký.',
    'Thổ Tú': 'Giữ nếp sinh hoạt ổn định; việc đi xa, đổi chỗ ở nên tính kỹ.',
    'Thủy Diệu': 'Thuận cho học hỏi, giao thương; đi lại đường thủy nên chuẩn bị chu đáo.',
    'Thái Bạch': 'Chi tiêu có kế hoạch, giữ một khoản dự phòng.',
    'Thái Dương': 'Năm sáng sủa, hợp chủ động trong công việc và dự định mới.',
    'Vân Hán': 'Bình tĩnh khi có bất đồng, nghỉ ngơi điều độ.',
    'Kế Đô': 'Dành thời gian cho gia đình; việc lớn nên bàn kỹ với người thân.',
    'Thái Âm': 'Năm êm, hợp với kế hoạch dài hạn và việc cần kiên nhẫn.',
    'Mộc Đức': 'Năm thuận hòa, hợp vun đắp các mối quan hệ và việc học.',
  },
  en: {
    'La Hầu': 'Speak gently and read papers carefully before signing.',
    'Thổ Tú': 'Keep a steady routine; think trips and moves through.',
    'Thủy Diệu': 'Good for learning and trade; prepare well for travel by water.',
    'Thái Bạch': 'Spend to a plan and keep some savings aside.',
    'Thái Dương': 'A bright year, good for taking the lead and new plans.',
    'Vân Hán': 'Stay calm in disagreements and rest well.',
    'Kế Đô': 'Make time for family; talk big decisions over at home.',
    'Thái Âm': 'A calm year, good for long-term plans and patient work.',
    'Mộc Đức': 'A harmonious year, good for relationships and study.',
  },
};

/** One gentle reminder per limit (Bát Hạn), never a prediction. */
export const HAN_NOTES: Record<Locale, Record<BatHan, string>> = {
  vi: {
    'Huỳnh Tuyền': 'Chăm sóc sức khỏe đều đặn, khám định kỳ.',
    'Tam Kheo': 'Cẩn thận khi vận động, chơi thể thao và đi lại.',
    'Ngũ Mộ': 'Giữ gìn đồ đạc, tài sản; chi tiêu có tính toán.',
    'Thiên Tinh': 'Rõ ràng trong giấy tờ, hợp đồng và lời hứa.',
    'Toán Tận': 'Quản lý tài chính chặt chẽ, không đầu tư vội.',
    'Thiên La': 'Nhiều việc cùng lúc: sắp thứ tự ưu tiên và nghỉ ngơi hợp lý.',
    'Địa Võng': 'Giữ lời nói chừng mực, tránh chuyện thị phi.',
    'Diêm Vương': 'Quan tâm sức khỏe của mình và người thân, sống điều độ.',
  },
  en: {
    'Huỳnh Tuyền': 'Look after your health and keep regular check-ups.',
    'Tam Kheo': 'Take care when exercising, playing sport and travelling.',
    'Ngũ Mộ': 'Look after your belongings; spend with care.',
    'Thiên Tinh': 'Be clear in papers, contracts and promises.',
    'Toán Tận': 'Keep a close eye on money; no hasty investments.',
    'Thiên La': 'A busy year: set priorities and rest enough.',
    'Địa Võng': 'Choose words carefully and stay out of gossip.',
    'Diêm Vương': 'Look after your own and your family’s health; live in moderation.',
  },
};
