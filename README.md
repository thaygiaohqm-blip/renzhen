# Super Renzhen

Bộ công cụ học tiếng Trung theo chuẩn HSK 3.0 (GF 0025—2021) của Minh Dokkai, dựng trên khung của Super Honki. Website tĩnh (HTML, CSS, JavaScript thuần), không cần build; chỉ chức năng tài khoản đồng bộ nhiều thiết bị và bảng xếp hạng cần thêm máy chủ nhỏ (Vercel Functions + Upstash Redis).

```
index.html            trang chủ Super Renzhen
shared/               logo, thanh chuyển app, đồng bộ tiến độ (rzsync.js), hộp ủng hộ, ảnh
hanzi/                Super Hanzi: 3.000 chữ Hán; dữ liệu sinh bằng hanzi/tools/build.py
cihui/                Super Cihui: 11.092 từ vựng HSK 1–7–9; dữ liệu sinh bằng cihui/tools/build_vocab.py
yufa/                 Super Yufa: 573 điểm ngữ pháp; dữ liệu sinh bằng yufa/tools/build_gram.py; có tab "Giáo trình" chờ nội dung
kouyu/                Super Kouyu: luyện nói HSKK; nội dung ở kouyu/tools/c_*.py, sinh data bằng kouyu/tools/build.py
youxi/                Super Youxi: 5 trò chơi; api/youxi.js lưu bảng xếp hạng và ghép trận bằng Redis
api/                  đăng ký, đăng nhập, lưu tiến độ, ủng hộ (Vercel Functions)
package.json, vercel.json, .env.example
```

## Chạy thử trên máy

`node dev-server.js` (mặc định cổng 8000, đổi bằng biến PORT). Máy chủ phục vụ các trang tĩnh và giả lập /api bằng bộ nhớ tạm, nên đăng ký, đăng nhập, đồng bộ tiến độ và bảng xếp hạng chạy thử được mà không cần Redis (dữ liệu mất khi tắt máy chủ).

## Đưa lên Vercel và bật tài khoản (làm một lần)

1. Đẩy cả thư mục lên GitHub rồi vào vercel.com, Add New, Project, chọn repo. Framework chọn "Other", không cần lệnh build.
2. Trong dự án, thêm "Upstash Redis" ở Storage/Marketplace và nối vào dự án. Vercel tự thêm `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
3. Vào Settings, Environment Variables, thêm `AUTH_SECRET` là một chuỗi ngẫu nhiên dài (`openssl rand -hex 32`). Đừng đổi sau này, nếu đổi thì mọi người phải đăng nhập lại.
4. Deploy lại. Bấm Đăng nhập ở bất kỳ app nào: không còn dòng "Chế độ trên thiết bị" là đã chạy bằng máy chủ.

Một tài khoản dùng chung cho cả năm app. Tiến độ mỗi app lưu riêng qua `/api/progress?app=cihui|yufa|hanzi|kouyu`, nên học bên này không ghi đè bên kia. Netlify không chạy được thư mục `api/` theo định dạng này.

## Sửa dữ liệu

- Từ vựng: nghĩa tiếng Việt viết ở `cihui/tools/data/vi-h1.txt` (hiện mới có HSK 1; các cấp sau hiển thị nghĩa tiếng Anh từ CC-CEDICT cho tới khi bổ sung), rồi chạy `python3 cihui/tools/build_vocab.py`.
- Ngữ pháp: giải thích tiếng Việt ở `yufa/tools/data/vi-gram.txt` (đã có cho 129 điểm HSK 1–2), rồi chạy `python3 yufa/tools/build_gram.py`.
- Chữ Hán: `hanzi/tools/data/`, rồi chạy `python3 hanzi/tools/build.py`.
- Luyện nói: sửa các file `kouyu/tools/c_chu.py`, `c_zhong.py`, `c_gao.py`, rồi chạy `python3 kouyu/tools/build.py` (cần `pip install pypinyin`).
- Giáo trình ngữ pháp: khi có giáo trình, cấu hình danh sách bài trong tab "Giáo trình" của `yufa/assets/app.js` (hàm `giaotrinh`).

## Màu giao diện và tài khoản dùng chung

Màu chủ đề lưu ở khoá `renzhen:theme`, phiên đăng nhập ở `renzhen:auth` (cùng một nguồn gốc nên mọi app dùng chung). Mỗi app có khoá tiến độ riêng dạng `renzhen:<app>:v1`.

## Ủng hộ và thống kê truy cập

Mục "Ủng hộ" ở trang chủ lấy thông tin trong `index.html` (mã `ung-ho`) và mã QR ở `shared/img/qr-donate.svg`. Thống kê lượt truy cập dùng Vercel Web Analytics (bật ở tab Analytics của project).

## Nguồn dữ liệu và giấy phép

Đại cương HSK 3.0 (GF 0025—2021) cho danh mục chữ, từ và ngữ pháp; ivankra/hsk30 (MIT); CC-CEDICT (CC BY-SA); MakeMeAHanzi (nét chữ, Arphic Public License/LGPL); Unihan; pypinyin; jieba. Phần chữ Hán tiếng Việt, nguồn gốc chữ và lý thuyết lấy từ bộ sách của Minh Dokkai.
