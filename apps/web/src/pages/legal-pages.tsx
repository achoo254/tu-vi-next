/** /privacy, /terms and /credits in Vietnamese and English. `{app}` is the brand name. */
import type { ReactNode } from 'react';
import { APP_HOST } from '../brand';
import { type Locale, format, useI18n } from '../i18n/i18n';

interface Section {
  heading: string;
  paragraphs?: string[];
  items?: Array<string | { text: string; href?: string; note: string }>;
}

interface LegalDoc {
  title: string;
  intro: string;
  sections: Section[];
}

export type LegalPageKind = 'privacy' | 'terms' | 'credits';

const ICON_LICENCE = 'AI-generated with OpenAI gpt-image for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).';
const VIDEO_LICENCE =
  'AI-generated with open models (FLUX.2 klein 4B and Wan 2.2 for pictures and motion, RIFE for in-between frames, VieNeu-TTS preset voices, ACE-Step 1.5 for music; Apache-2.0 or MIT) for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).';
const OPEN_ART_LICENCE = 'AI-generated with open models (Qwen-Image, Z-Image-Turbo, FLUX.2 klein 4B; Apache-2.0) for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).';

const DOCS: Record<LegalPageKind, Record<Locale, LegalDoc>> = {
  privacy: {
    vi: {
      title: 'Quyền riêng tư',
      intro: `{app} (${APP_HOST}) là app giải trí do một nhà phát triển độc lập vận hành. Trang này nói rõ app giữ gì và không giữ gì.`,
      sections: [
        {
          heading: 'Khi chưa đăng nhập',
          paragraphs: [
            'Lá số được tính ngay trên trình duyệt của bạn. Ngày giờ sinh, họ tên và giới tính bạn nhập không được gửi lên máy chủ; trình duyệt chỉ nhớ lá số gần nhất (localStorage) để mở lại khi bạn quay lại. Xoá dữ liệu trang web trong trình duyệt là xoá hết.',
          ],
        },
        {
          heading: 'Khi đăng nhập',
          items: [
            'Đăng nhập qua tài khoản hoandat.com (auth.hoandat.com) với quyền "openid": app chỉ nhận một mã định danh tài khoản, không nhận email, tên hay ảnh.',
            'Lá số bạn bấm "Lưu" được giữ dưới dạng dữ liệu đầu vào (họ tên nếu có, ngày giờ sinh, lịch, giới tính), tối đa 50 lá số mỗi tài khoản. Lá số luôn được tính lại trên trình duyệt.',
            'Một cookie phiên (__Host-tuvi_session) giữ bạn đăng nhập tối đa 30 ngày; máy chủ chỉ lưu bản băm của nó.',
            'Bạn xoá được từng lá số bất cứ lúc nào; đăng xuất là huỷ phiên trên máy chủ.',
          ],
        },
        {
          heading: 'Số liệu truy cập',
          paragraphs: [
            'Trang có thể dùng Cloudflare Web Analytics để đếm lượt xem trang. Công cụ này không đặt cookie và không theo dõi bạn sang trang khác. App không dùng quảng cáo và không bán dữ liệu.',
          ],
        },
        {
          heading: 'Liên hệ',
          paragraphs: ['Muốn hỏi hay yêu cầu xoá dữ liệu: nhắn Trang Facebook Hoandat Apps.'],
        },
      ],
    },
    en: {
      title: 'Privacy',
      intro: `{app} (${APP_HOST}) is an entertainment app run by an independent developer. This page says what the app keeps and what it does not.`,
      sections: [
        {
          heading: 'Signed out',
          paragraphs: [
            'The chart is computed in your browser. The birth date and time, name and gender you enter are not sent to the server; the browser only remembers your latest chart (localStorage) so it is there when you come back. Clearing the site data in your browser removes it.',
          ],
        },
        {
          heading: 'Signed in',
          items: [
            'You sign in with your hoandat.com account (auth.hoandat.com) and the "openid" scope only: the app receives an account identifier, not your email, name or picture.',
            'Charts you save are kept as the inputs (name if given, birth date and time, calendar, gender), at most 50 per account. The chart itself is always computed again in the browser.',
            'A session cookie (__Host-tuvi_session) keeps you signed in for up to 30 days; the server stores only its hash.',
            'You can delete any saved chart at any time; signing out ends the session on the server.',
          ],
        },
        {
          heading: 'Usage numbers',
          paragraphs: [
            'The site may use Cloudflare Web Analytics to count page views. It sets no cookie and does not follow you to other sites. The app shows no ads and sells no data.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: ['Questions or data deletion requests: message the Hoandat Apps Facebook Page.'],
        },
      ],
    },
  },
  terms: {
    vi: {
      title: 'Điều khoản sử dụng',
      intro: `{app} (${APP_HOST}) là app giải trí miễn phí. Dùng app nghĩa là bạn đồng ý với các điều dưới đây.`,
      sections: [
        {
          heading: 'Nội dung giải trí',
          items: [
            'Lá số và nghĩa các sao chỉ mang tính giải trí, tham khảo. Không dùng chúng thay cho lời khuyên y tế, pháp lý, tài chính hay cho các quyết định quan trọng.',
            'Cách an sao theo thư viện iztro với cấu hình mặc định; các trường phái tử vi có thể an sao khác nhau.',
          ],
        },
        {
          heading: 'Dữ liệu bạn nhập',
          items: [
            'Chỉ nhập thông tin của bạn, hoặc của người đã đồng ý. Ảnh lá số bạn tải về và chia sẻ là do bạn quyết định.',
            'Mỗi tài khoản lưu tối đa 50 lá số.',
          ],
        },
        {
          heading: 'Trách nhiệm',
          paragraphs: [
            'App được cung cấp "như hiện có". Nhà phát triển có thể thay đổi, tạm dừng hay ngừng app bất cứ lúc nào. Điều khoản có thể được cập nhật; bản mới nhất luôn ở trang này.',
          ],
        },
        { heading: 'Liên hệ', paragraphs: ['Nhắn Trang Facebook Hoandat Apps.'] },
      ],
    },
    en: {
      title: 'Terms of Service',
      intro: `{app} (${APP_HOST}) is a free entertainment app. By using it you agree to the terms below.`,
      sections: [
        {
          heading: 'Entertainment content',
          items: [
            'Charts and star meanings are for entertainment and reference only. Do not use them in place of medical, legal or financial advice, or for important decisions.',
            'Stars are placed by the iztro library with its default settings; schools of tử vi can place them differently.',
          ],
        },
        {
          heading: 'What you enter',
          items: [
            'Enter only your own details, or those of someone who agreed. Chart images you download and share are your choice.',
            'Each account keeps at most 50 charts.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'The app is provided "as is". The developer may change, pause or stop it at any time. These terms may be updated; the latest version is always on this page.',
          ],
        },
        { heading: 'Contact', paragraphs: ['Message the Hoandat Apps Facebook Page.'] },
      ],
    },
  },
  credits: {
    vi: {
      title: 'Ghi công',
      intro: '{app} đứng trên vai những dự án mã nguồn mở và tài liệu dưới đây.',
      sections: [
        {
          heading: 'Lõi lá số và lịch',
          items: [
            { text: 'iztro', href: 'https://github.com/SylarLong/iztro', note: 'của SylarLong, giấy phép MIT: an sao, cung và dữ liệu tiếng Việt (vi-VN) của lá số.' },
            { text: 'lunar-typescript', href: 'https://github.com/6tail/lunar-typescript', note: 'của 6tail, giấy phép MIT: âm lịch Trung Quốc mà iztro dùng, và lịch Việt Nam trước 8/8/1967.' },
            {
              text: 'Thuật toán âm lịch Việt Nam của Hồ Ngọc Đức',
              note: 'theo "Astronomical Algorithms" của Jean Meeus, tính ở múi giờ UTC+7; app viết lại thuật toán đã công bố.',
            },
            {
              text: 'ziwei-doushu',
              href: 'https://github.com/Renhuai123/ziwei-doushu',
              note: 'của Renhuai123 (mã nguồn MIT): chỉ đọc tham khảo ý tưởng cho bộ test hồi quy; không chép mã hay bộ dữ liệu nào.',
            },
          ],
        },
        {
          heading: 'Lời luận giải',
          paragraphs: [
            'Lời luận giải các sao, cung, tứ hóa, cục và phần Tử vi theo năm là văn bản tự viết cho app, không chép câu chữ sách hay trang nào; ý nghĩa theo quy ước của Tử Vi Đẩu Số Tân Biên (Vân Đằng Thái Thứ Lang), viết lại bằng giọng hiện đại, tích cực. Nội dung mang tính giải trí, tham khảo.',
            'Bảng sao chiếu mệnh và hạn tính theo cách đếm Cửu Diệu, Bát Hạn của Báo Hà Tĩnh và Báo La Văn Sử, đối chiếu với bảng năm 2027 của ngaydep.com.',
          ],
        },
        {
          heading: 'Giao diện',
          items: [
            { text: 'React', href: 'https://react.dev', note: 'giấy phép MIT.' },
            { text: 'Inter', href: 'https://rsms.me/inter/', note: 'và JetBrains Mono, giấy phép SIL Open Font License 1.1.' },
          ],
        },
        { heading: 'Biểu tượng app', paragraphs: [ICON_LICENCE] },
        {
          heading: 'Hình minh hoạ',
          paragraphs: [
            '12 con giáp, 14 huy hiệu chính tinh, nền giấy bầu trời sao, khung và huy chương của bàn lá số: ' + ICON_LICENCE,
            'Huy hiệu 12 cung, tứ hóa và ngũ hành cục, tranh trang chủ, ảnh xem trước khi chia sẻ link, hình danh sách lá số trống và trang 404: ' +
              OPEN_ART_LICENCE,
          ],
        },
        { heading: 'Video tử vi 2027', paragraphs: ['12 video trên các trang tuổi (hình, chuyển động, giọng đọc, nhạc): ' + VIDEO_LICENCE] },
        { heading: 'Mã nguồn', paragraphs: ['Mã nguồn của app theo giấy phép MIT.'] },
      ],
    },
    en: {
      title: 'Credits',
      intro: '{app} stands on the open-source projects and references below.',
      sections: [
        {
          heading: 'Chart engine and calendar',
          items: [
            { text: 'iztro', href: 'https://github.com/SylarLong/iztro', note: 'by SylarLong, MIT licence: star placement, palaces and the Vietnamese (vi-VN) chart data.' },
            { text: 'lunar-typescript', href: 'https://github.com/6tail/lunar-typescript', note: 'by 6tail, MIT licence: the Chinese lunar calendar iztro reads, and the Vietnamese calendar before 8 August 1967.' },
            {
              text: "Hồ Ngọc Đức's Vietnamese lunar calendar algorithm",
              note: 'after Jean Meeus, "Astronomical Algorithms", computed at UTC+7; the app re-implements the published algorithm.',
            },
            {
              text: 'ziwei-doushu',
              href: 'https://github.com/Renhuai123/ziwei-doushu',
              note: 'by Renhuai123 (MIT code): read only as a reference for regression-test ideas; no code or dataset copied.',
            },
          ],
        },
        {
          heading: 'Interpretations',
          paragraphs: [
            'The readings of stars, palaces, transformations, element classes and the yearly pages are original text written for the app, copying no book or website; the meanings follow the conventions of Tử Vi Đẩu Số Tân Biên (Vân Đằng Thái Thứ Lang), retold in a modern, positive tone. For entertainment and reference only.',
            'The guiding star and limit tables follow the Cửu Diệu and Bát Hạn counting described by Báo Hà Tĩnh and Báo La Văn Sử, checked against the 2027 table of ngaydep.com.',
          ],
        },
        {
          heading: 'Interface',
          items: [
            { text: 'React', href: 'https://react.dev', note: 'MIT licence.' },
            { text: 'Inter', href: 'https://rsms.me/inter/', note: 'and JetBrains Mono, SIL Open Font License 1.1.' },
          ],
        },
        { heading: 'App icon', paragraphs: [ICON_LICENCE] },
        {
          heading: 'Illustrations',
          paragraphs: [
            'The 12 zodiac animals, the 14 major-star emblems, the starry paper, the board frame and the medallion: ' + ICON_LICENCE,
            'The emblems of the 12 palaces, the four transformations and the five element classes, the home illustration, the link-preview picture, the empty saved-charts picture and the 404 picture: ' +
              OPEN_ART_LICENCE,
          ],
        },
        { heading: '2027 horoscope videos', paragraphs: ['The 12 videos on the sign pages (pictures, motion, voice, music): ' + VIDEO_LICENCE] },
        { heading: 'Source code', paragraphs: ["The app's source code is under the MIT licence."] },
      ],
    },
  },
};

export function legalTitle(kind: LegalPageKind, locale: Locale): string {
  return DOCS[kind][locale].title;
}

export function LegalPage({ kind }: { kind: LegalPageKind }): ReactNode {
  const { locale } = useI18n();
  const doc = DOCS[kind][locale];
  return (
    <article className="card doc" data-id={`legal-${kind}`}>
      <h1 className="doc-title">{doc.title}</h1>
      <p>{format(doc.intro)}</p>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="doc-heading">{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.items && (
            <ul>
              {section.items.map((item) =>
                typeof item === 'string' ? (
                  <li key={item}>{item}</li>
                ) : (
                  <li key={item.text}>
                    {item.href ? (
                      <a href={item.href} rel="noopener noreferrer">
                        {item.text}
                      </a>
                    ) : (
                      <b>{item.text}</b>
                    )}{' '}
                    {item.note}
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
