# Booking Home

Sổ quản lý phòng: lịch booking, chi tiết khách, chi phí và doanh thu theo từng kỳ khoảng 2 tháng. Dữ liệu thật nằm trên Google Sheet, mỗi kỳ một tab.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Khi chưa điền `VITE_APPS_SCRIPT_URL`, app dùng dữ liệu mẫu trong trình duyệt và hiện banner vàng. Mật khẩu chế độ này là `quanduy123` (chỉ để mở thử; bản nối Google Sheet không đóng mật khẩu vào JavaScript).

```bash
npm test
```

## Nối Google Sheet

Google Sheet không cho dấu `/` trong tên tab. Đặt tên tab bằng dấu chấm, web vẫn hiện ngày có dấu gạch:

- Tab: `11.11.2026-10.01.2027`
- Nhãn: `11/11/2026 - 10/01/2027`

1. Tạo Google Sheet, timezone Asia/Ho_Chi_Minh. Mỗi kỳ một tab đúng tên trên.
2. Extensions → Apps Script. Xóa mã mẫu, dán toàn bộ [`apps-script/Code.gs`](apps-script/Code.gs).
3. Project Settings → Script properties → thêm `APP_PASSWORD` = `quanduy123`.
4. Deploy → New deployment → Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy URL `/exec` vào `.env`:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/....../exec
```

6. Chạy lại `npm run dev`. Banner vàng biến mất. Mọi thao tác ghi lên sheet và được script kiểm tra mật khẩu.

Trong Sheet có menu **Booking Home → Khởi tạo tiêu đề kỳ này** nếu tab còn trống.

## Bố cục một tab

- Cột A–L: Chi tiết (nguồn sự thật của booking)
- Cột N–R: Chi phí
- Cột T–X: Doanh thu, script ghi lại sau mỗi lần sửa
- Cột Z trở đi: lịch booking, script vẽ lại (gộp đêm, tô màu phòng)

Sửa trên web. Ô lịch trên Sheet là bản xem, không phải chỗ nhập.

## Quy tắc sổ

- Đêm ở tính từ check-in đến sáng check-out. Ô lịch không tô ngày trả phòng.
- Cùng một phòng không được đè đêm.
- Check-in và check-out phải nằm trong kỳ đang mở.
- Doanh thu = tổng Giá thu. Chi phí trên tab Doanh thu = tổng chi phí vận hành. Lợi nhuận chia đôi; đồng lẻ nằm ở phần Quân Duy.
- Tab kỳ đang chọn và mục sidebar được nhớ trong `localStorage`. Mật khẩu chỉ nằm trong `sessionStorage` đến khi đóng tab.
