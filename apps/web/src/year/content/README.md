# Luận giải năm theo con giáp

Mỗi file `year-<năm>/<con giáp>.json` (`ty`, `suu`, `dan`, `mao`, `thin`, `ti`, `ngo`, `mui`, `than`, `dau`, `tuat`,
`hoi`, đúng slug trong [`year-routes.ts`](../year-routes.ts)) là phần luận giải viết sẵn cho trang
`/tu-vi-<năm>/tuoi-<con giáp>`:

| Trường | Mục trên trang |
|---|---|
| `overview` | Tổng quan |
| `career` | Công việc, tài chính |
| `love` | Tình cảm, gia đình |
| `health` | Sức khỏe |
| `advice` | Lời khuyên |

- Văn bản tiếng Việt thuần, đoạn cách nhau bằng một dòng trống. Không HTML, không Markdown.
- Trường rỗng thì mục đó không hiện; cả file rỗng thì trang chỉ có phần số liệu. Không bao giờ để chữ giữ chỗ.
- Giọng văn theo quyết định trong plan: cân bằng, tích cực, điểm mạnh trước, thách thức là xu hướng kèm lời khuyên,
  không doạ. Tự viết, không chép câu chữ sách nào.
- File sai dạng làm hỏng test `year-content.test.ts` (và trang bỏ qua phần luận giải đó thay vì vỡ trang).
