/** /privacy, /terms and /credits in Vietnamese, English and Simplified Chinese. `{app}` is the brand name. */
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

/** Where a hoandat.com account is deleted (auth-next ADR 0018): the app has no deletion of its own. */
const ACCOUNT_DELETE_URL = 'https://auth.hoandat.com/account#account-delete';

const ICON_LICENCE = 'AI-generated with OpenAI gpt-image for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).';
const APP_ICON_LICENCE = 'AI-generated with open models (FLUX.2 klein 4B; Apache-2.0) for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).';
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
            'Đăng nhập qua tài khoản hoandat.com (auth.hoandat.com) với quyền "openid profile email": app nhận mã định danh tài khoản, tên hiển thị (không có thì tên người dùng), email và địa chỉ ảnh đại diện của tài khoản.',
            'Tên, email và địa chỉ ảnh được lưu cùng tài khoản trên máy chủ của app và cập nhật mỗi lần bạn đăng nhập, chỉ để hiện trong menu tài khoản ở đầu trang. App không gửi email cho bạn, không dùng chúng vào việc khác và không chia sẻ chúng với ai.',
            'Ảnh đại diện do trình duyệt tải thẳng từ nơi giữ ảnh (Google hoặc GitHub, tuỳ cách bạn đăng nhập), không kèm địa chỉ trang đang xem; app không lưu bản sao của ảnh. Đăng nhập bằng Apple thì không có ảnh đại diện, vì Apple không chia sẻ ảnh.',
            'Lá số bạn bấm "Lưu" được giữ dưới dạng dữ liệu đầu vào (họ tên nếu có, ngày giờ sinh, lịch, giới tính), tối đa 50 lá số mỗi tài khoản. Lá số luôn được tính lại trên trình duyệt.',
            'Quẻ hôm nay: máy chủ chỉ lưu ngày gần nhất bạn xin quẻ và số ngày liên tiếp, để hiện chuỗi ngày. Quẻ được chọn trên trình duyệt từ lá số đã lưu và ngày hôm đó, không lưu lại; lá số chọn để xin quẻ chỉ được nhớ trên trình duyệt này.',
            'Nhắc quẻ hôm nay (chỉ khi bạn bật): với mỗi máy bật nhắc, máy chủ lưu địa chỉ nhận thông báo (push endpoint) và khoá mã hoá mà trình duyệt cấp, cùng ngôn ngữ của lời nhắc, chỉ để mỗi sáng gửi một thông báo "quẻ hôm nay đã sẵn sàng" qua dịch vụ thông báo của trình duyệt (Google, Mozilla, Apple hoặc Microsoft, tuỳ trình duyệt). Lời nhắc không chứa tên hay ngày giờ sinh. Máy chủ ghi thêm ngày gần nhất đã gửi để mỗi ngày chỉ gửi một lần. Địa chỉ đó bị xoá khi bạn tắt nhắc trên máy đó, hoặc khi trình duyệt huỷ việc nhận thông báo.',
            'Một cookie phiên (__Host-tuvi_session) giữ bạn đăng nhập tối đa 30 ngày; máy chủ chỉ lưu bản băm của nó.',
            'Bạn xoá được từng lá số bất cứ lúc nào; đăng xuất là huỷ phiên trên máy chủ.',
            {
              text: 'Xoá tài khoản hoandat.com',
              href: ACCOUNT_DELETE_URL,
              note: 'là cách duy nhất để xoá tài khoản; khi đó app xoá ngay mọi dữ liệu của tài khoản ở đây: tên, email, ảnh, các lá số đã lưu, chuỗi ngày xem quẻ, các máy bật nhắc quẻ và mọi phiên đăng nhập.',
            },
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
          paragraphs: ['Có câu hỏi: nhắn Trang Facebook Hoandat Apps.'],
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
            'You sign in with your hoandat.com account (auth.hoandat.com) with the "openid profile email" scopes: the app receives an account identifier, your display name (or username if there is none), your email and the address of your profile picture.',
            'The name, email and picture address are stored with your account on the app\'s server and updated each time you sign in, only to show in the account menu at the top of the page. The app sends you no email, uses them for nothing else and shares them with no one.',
            'Your browser loads the profile picture straight from where it is kept (Google or GitHub, depending on how you sign in), without the address of the page you are on; the app keeps no copy of it. Signing in with Apple gives no picture, because Apple does not share one.',
            'Charts you save are kept as the inputs (name if given, birth date and time, calendar, gender), at most 50 per account. The chart itself is always computed again in the browser.',
            'Quẻ of the day: the server keeps only the latest day you drew a quẻ and how many days in a row, to show your streak. The quẻ is picked in the browser from the saved chart and the day and is not stored; the chart you draw for is remembered in this browser only.',
            'Quẻ reminder (only if you turn it on): for each device you turn it on in, the server keeps the push address (push endpoint) and encryption keys the browser gives, and the language of the reminder, only to send one "today\'s quẻ is ready" notification each morning through the browser\'s push service (Google, Mozilla, Apple or Microsoft, depending on the browser). The reminder carries no name or birth data. The server also notes the latest day it sent one, so it sends at most one a day. The address is removed when you turn the reminder off on that device, or when the browser drops the subscription.',
            'A session cookie (__Host-tuvi_session) keeps you signed in for up to 30 days; the server stores only its hash.',
            'You can delete any saved chart at any time; signing out ends the session on the server.',
            {
              text: 'Delete your hoandat.com account',
              href: ACCOUNT_DELETE_URL,
              note: 'is the only way to delete the account; the app then deletes everything of it here at once: the name, email, picture, saved charts, quẻ streak, reminder devices and every session.',
            },
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
          paragraphs: ['Questions: message the Hoandat Apps Facebook Page.'],
        },
      ],
    },
    'zh-CN': {
      title: '隐私',
      intro: `{app}（${APP_HOST}）是由一位独立开发者运营的娱乐应用。本页说明应用保存什么、不保存什么。`,
      sections: [
        {
          heading: '未登录时',
          paragraphs: [
            '命盘直接在你的浏览器中计算。你输入的出生日期和时间、姓名和性别不会发送到服务器；浏览器只记住你最近的一张命盘（localStorage），方便你回来时打开。在浏览器中清除网站数据即可全部删除。',
          ],
        },
        {
          heading: '登录后',
          items: [
            '通过 hoandat.com 账号（auth.hoandat.com）以 "openid profile email" 权限登录：应用会收到账号标识、显示名称（没有则为用户名）、邮箱和头像地址。',
            '名称、邮箱和头像地址随账号保存在应用的服务器上，每次登录时更新，仅用于在页面顶部的账号菜单中显示。应用不会给你发邮件，不作他用，也不与任何人共享。',
            '头像由浏览器直接从保存它的地方（Google 或 GitHub，取决于你的登录方式）加载，不附带你正在浏览的页面地址；应用不保存头像副本。使用 Apple 登录则没有头像，因为 Apple 不共享头像。',
            '你点击“保存”的命盘以输入数据的形式保存（姓名（如有）、出生日期和时间、历法、性别），每个账号最多 50 张。命盘始终在浏览器中重新计算。',
            '今日签：服务器只保存你最近一次求签的日期和连续天数，用于显示连续记录。签在浏览器中根据已保存的命盘和当天日期选出，不会保存；用来求签的命盘只记在这个浏览器里。',
            '今日签提醒（仅在你开启时）：对每台开启提醒的设备，服务器保存浏览器提供的推送地址（push endpoint）和加密密钥，以及提醒的语言，仅用于每天早上通过浏览器的推送服务（Google、Mozilla、Apple 或 Microsoft，取决于浏览器）发送一条“今日签已准备好”的通知。提醒不包含姓名或出生信息。服务器还会记下最近一次发送的日期，确保每天最多发送一次。你在该设备上关闭提醒，或浏览器取消订阅时，该地址即被删除。',
            '会话 Cookie（__Host-tuvi_session）让你保持登录最多 30 天；服务器只保存它的哈希值。',
            '你可以随时删除任何已保存的命盘；退出登录即在服务器上结束会话。',
            {
              text: '删除 hoandat.com 账号',
              href: ACCOUNT_DELETE_URL,
              note: '是删除账号的唯一方式；届时应用会立即删除该账号在这里的全部数据：名称、邮箱、头像、已保存的命盘、看签连续记录、开启提醒的设备和所有登录会话。',
            },
          ],
        },
        {
          heading: '访问统计',
          paragraphs: [
            '网站可能使用 Cloudflare Web Analytics 统计页面浏览量。它不设置 Cookie，也不会在其他网站上跟踪你。应用不展示广告，也不出售数据。',
          ],
        },
        {
          heading: '联系',
          paragraphs: ['有问题：请在 Facebook 上给 Hoandat Apps 主页发消息。'],
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
    'zh-CN': {
      title: '使用条款',
      intro: `{app}（${APP_HOST}）是一款免费的娱乐应用。使用本应用即表示你同意以下条款。`,
      sections: [
        {
          heading: '娱乐内容',
          items: [
            '命盘和星曜含义仅供娱乐和参考。请勿用其代替医疗、法律或财务建议，也不要据此做重要决定。',
            '星曜按 iztro 库的默认设置安放；不同的紫微斗数流派可能安星不同。',
          ],
        },
        {
          heading: '你输入的数据',
          items: ['只输入你自己的信息，或已征得对方同意的信息。下载和分享命盘图片由你自己决定。', '每个账号最多保存 50 张命盘。'],
        },
        {
          heading: '责任',
          paragraphs: ['本应用按“现状”提供。开发者可随时更改、暂停或停止本应用。条款可能会更新；最新版本始终在本页。'],
        },
        { heading: '联系', paragraphs: ['请在 Facebook 上给 Hoandat Apps 主页发消息。'] },
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
        { heading: 'Biểu tượng app', paragraphs: [APP_ICON_LICENCE] },
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
        { heading: 'App icon', paragraphs: [APP_ICON_LICENCE] },
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
    'zh-CN': {
      title: '致谢',
      intro: '{app} 建立在以下开源项目和参考资料之上。',
      sections: [
        {
          heading: '排盘核心与历法',
          items: [
            { text: 'iztro', href: 'https://github.com/SylarLong/iztro', note: '作者 SylarLong，MIT 许可：安星、宫位和命盘的越南语（vi-VN）数据。' },
            { text: 'lunar-typescript', href: 'https://github.com/6tail/lunar-typescript', note: '作者 6tail，MIT 许可：iztro 使用的中国农历，以及 1967 年 8 月 8 日之前的越南历法。' },
            {
              text: 'Hồ Ngọc Đức 的越南农历算法',
              note: '依据 Jean Meeus 的《Astronomical Algorithms》，按 UTC+7 时区计算；应用重新实现了已公开的算法。',
            },
            {
              text: 'ziwei-doushu',
              href: 'https://github.com/Renhuai123/ziwei-doushu',
              note: '作者 Renhuai123（MIT 代码）：仅作为回归测试思路的参考阅读；未复制任何代码或数据集。',
            },
          ],
        },
        {
          heading: '命盘解读',
          paragraphs: [
            '星曜、宫位、四化、五行局以及年度运势的解读均为本应用原创文字（越南语），未照抄任何书籍或网站；含义遵循《紫微斗数新编》（Vân Đằng Thái Thứ Lang）的惯例，以现代、积极的语气重写。仅供娱乐和参考。',
            '值年星与年限表按 Báo Hà Tĩnh 和 Báo La Văn Sử 所述的九曜、八限算法，并与 ngaydep.com 的 2027 年表核对。',
          ],
        },
        {
          heading: '界面',
          items: [
            { text: 'React', href: 'https://react.dev', note: 'MIT 许可。' },
            { text: 'Inter', href: 'https://rsms.me/inter/', note: '和 JetBrains Mono，SIL Open Font License 1.1 许可。' },
          ],
        },
        { heading: '应用图标', paragraphs: [APP_ICON_LICENCE] },
        {
          heading: '插图',
          paragraphs: [
            '十二生肖、十四主星徽章、星空纸纹、命盘边框和徽章：' + ICON_LICENCE,
            '十二宫、四化和五行局徽章、首页插图、链接预览图、空命盘列表插图和 404 页插图：' + OPEN_ART_LICENCE,
          ],
        },
        { heading: '2027 年运势视频', paragraphs: ['各生肖页面上的 12 段视频（画面、动态、配音、音乐）：' + VIDEO_LICENCE] },
        { heading: '源代码', paragraphs: ['本应用的源代码采用 MIT 许可。'] },
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
