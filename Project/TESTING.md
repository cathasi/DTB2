# Hướng dẫn Test & Debug

## Các lỗi đã sửa

### 1. ✅ Không đặt được vé
**Nguyên nhân:**
- Backend yêu cầu `customer_id` nhưng CheckoutPage không gửi
- Format payload không khớp (`tickets` object vs `items` array)

**Đã sửa:**
- `backend/controllers/order.controller.js`: Support cả 2 format và lấy giá vé từ DB
- Thêm logic chuyển đổi `tickets: { tier_id: quantity }` sang `items` array

### 2. ✅ Không xem được "Vé của tôi"
**Nguyên nhân:**
- MyTicketsPage cần field `session_date` nhưng backend không trả về

**Đã sửa:**
- `backend/controllers/user.controller.js`: Thêm `DATE_FORMAT(es.Start_Date, '%d/%m/%Y %H:%i') AS session_date`

### 3. ✅ Không xem được "Tài khoản của tôi"
**Nguyên nhân:**
- MyAccountPage dùng `Full_Name` (uppercase) nhưng backend trả về `full_name` (lowercase)

**Đã sửa:**
- `frontend/src/pages/MyAccountPage.jsx`: Đổi tất cả field sang lowercase

### 4. ✅ Đăng nhập không thành công
**Nguyên nhân:**
- Backend trả về `{ message, user }` nhưng AuthContext lấy toàn bộ `res.data`

**Đã sửa:**
- `frontend/src/context/AuthContext.jsx`: Lấy `res.data.user` hoặc `res.data`

## Kiểm tra Backend có chạy đúng

### 1. Test API Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

Kết quả mong đợi:
```json
{
  "message": "Đăng nhập thành công",
  "user": {
    "user_id": 1,
    "full_name": "Test User",
    "email": "test@example.com",
    "user_type": "CUSTOMER"
  }
}
```

### 2. Test API Get My Tickets
```bash
curl "http://localhost:5000/api/my/tickets?customerId=1"
```

Kết quả mong đợi:
```json
[
  {
    "ticket_id": 1,
    "ticket_type": "VIP",
    "ticket_price": 500000,
    "ticket_status": "PAID",
    "session_id": 1,
    "start_date": "2025-01-15T19:00:00.000Z",
    "session_date": "15/01/2025 19:00",
    "event_id": 1,
    "event_name": "Concert ABC"
  }
]
```

### 3. Test API Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "full_name": "Nguyen Van A",
      "email": "a@example.com",
      "phone": "0901234567"
    },
    "event_id": 1,
    "session_id": 1,
    "tickets": {
      "1": 2,
      "2": 1
    }
  }'
```

Kết quả mong đợi:
```json
{
  "message": "Tạo đơn hàng thành công",
  "order_id": 123,
  "total_amount": 1500000
}
```

## Test Flow từ Frontend

### Flow 1: Đăng nhập
1. Mở http://localhost:5173
2. Click "Đăng nhập" ở góc phải
3. Nhập email và password (kiểm tra trong DB)
4. Click "Đăng nhập"
5. **Kết quả:** Redirect về trang chủ và hiển thị menu "Tài khoản"

### Flow 2: Xem tài khoản
1. Đăng nhập thành công
2. Click menu "Tài khoản" → "Tài khoản của tôi"
3. **Kết quả:** Hiển thị form với họ tên, email, số điện thoại
4. Sửa thông tin và click "Lưu thay đổi"
5. **Kết quả:** Hiển thị "Đã lưu thông tin tài khoản."

### Flow 3: Mua vé
1. Đăng nhập thành công
2. Ở trang chủ, click vào 1 sự kiện
3. Click "Chọn lịch diễn" hoặc scroll xuống
4. Click "Mua vé ngay" ở một suất diễn
5. **Kết quả:** Chuyển đến trang Checkout
6. Chọn số lượng vé bằng nút +/-
7. Điền thông tin: Họ tên, Email, Số điện thoại
8. Click "Xác nhận đặt vé"
9. **Kết quả:** Chuyển đến trang Payment với QR code
10. Click "Tôi đã thanh toán"
11. **Kết quả:** Chuyển đến trang Success

### Flow 4: Xem vé của tôi
1. Đăng nhập thành công
2. Click "Vé của tôi" ở header hoặc menu "Tài khoản"
3. **Kết quả:** Hiển thị danh sách vé đã mua (nếu đã đặt vé ở Flow 3)

## Debug Common Issues

### Lỗi: "Thiếu event_id hoặc session_id"
**Nguyên nhân:** CheckoutPage không truyền đủ thông tin
**Giải pháp:**
- Kiểm tra `state` trong CheckoutPage có đầy đủ `event`, `selectedSession`, `tiers` không
- Kiểm tra trong Console: `console.log(state)`

### Lỗi: "Vui lòng chọn ít nhất 1 vé"
**Nguyên nhân:** Không có vé nào được chọn (quantity = 0)
**Giải pháp:**
- Kiểm tra `quantities` state trong CheckoutPage
- Đảm bảo đã click nút + để tăng số lượng vé

### Lỗi: Network Error
**Nguyên nhân:**
- Backend chưa chạy
- Port không đúng (frontend proxy đến /api)

**Giải pháp:**
- Kiểm tra backend đang chạy: `cd backend && npm start`
- Kiểm tra `vite.config.js` có proxy `/api` đến `http://localhost:5000`

### Lỗi: "Email hoặc mật khẩu không đúng"
**Nguyên nhân:**
- User chưa tồn tại trong DB
- Password không đúng (lưu ý: demo dùng plain text)

**Giải pháp:**
- Kiểm tra table `User` trong database
- Thử với user mặc định (nếu có)
- Tạo user mới trong DB:
```sql
INSERT INTO User (Full_Name, Email, PasswordHash, User_type)
VALUES ('Test User', 'test@example.com', '123456', 'CUSTOMER');
```

### Lỗi: Không thấy giá vé hoặc hiển thị 0đ
**Nguyên nhân:**
- Chưa có dữ liệu trong bảng `pricing_tiers`
- Session chưa có hạng vé

**Giải pháp:**
- Kiểm tra bảng `pricing_tiers` có data cho `session_id` đó không
- Vào trang Admin để tạo hạng vé cho session

## Ports
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Database: localhost:3306

## Tài khoản test mặc định
Bạn cần tạo trong database:
```sql
-- CUSTOMER account
INSERT INTO User (Full_Name, Email, PasswordHash, Phone_Number, User_type)
VALUES ('Nguyen Van A', 'customer@test.com', '123456', '0901234567', 'CUSTOMER');

-- ORGANIZER account
INSERT INTO User (Full_Name, Email, PasswordHash, Phone_Number, User_type)
VALUES ('Organizer Test', 'organizer@test.com', '123456', '0909876543', 'ORGANIZER');

-- BOTH account
INSERT INTO User (Full_Name, Email, PasswordHash, Phone_Number, User_type)
VALUES ('Admin Test', 'admin@test.com', '123456', '0908888888', 'BOTH');
```

## Checklist trước khi demo

- [ ] Backend đang chạy (port 5000)
- [ ] Frontend đang chạy (port 5173)
- [ ] Database có data mẫu (events, sessions, pricing_tiers)
- [ ] Có ít nhất 1 user trong DB để test login
- [ ] Thư viện `qrcode` đã cài đặt (`npm install qrcode` trong frontend)
- [ ] Test login thành công
- [ ] Test xem tài khoản thành công
- [ ] Test mua vé (flow đầy đủ)
- [ ] Test xem vé của tôi

## Logs quan trọng

### Backend logs
```bash
cd backend
npm start
# Xem console để debug SQL queries
```

### Frontend logs
- Mở Developer Console (F12)
- Tab Console: Xem lỗi JavaScript
- Tab Network: Xem API requests/responses
- Tab Application > Local Storage: Xem authUser đã lưu chưa

## Tips Debug

1. **Luôn kiểm tra Network tab** trong Browser DevTools để xem API response
2. **Kiểm tra localStorage** xem user đã được lưu chưa sau khi login
3. **Kiểm tra Console** cho mọi error messages
4. **Backend logs** sẽ hiển thị SQL queries và errors
5. Dùng `console.log()` để debug state trong React components
