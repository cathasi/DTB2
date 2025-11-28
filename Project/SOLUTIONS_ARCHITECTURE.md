# Giải pháp Kiến trúc cho Hệ thống TicketBox

## 1. Venue & Seat Section Management

### Vấn đề hiện tại:
- Organizer chỉ nhập venue_id khi tạo event session
- Không có cơ chế cho organizer tạo venue mới
- Không có UI để customer xem seat map
- Không rõ cách xử lý khi venue mới được tạo

### Giải pháp đề xuất: **OPTION A - Venue Có Sẵn**

#### Quy trình:
```
1. Admin tạo venues + seat sections trước (sử dụng Admin Panel)
2. Organizer chọn venue từ danh sách có sẵn khi tạo event session
3. System tự động map seat sections từ venue đó
4. Customer xem seat map khi mua vé
```

#### Ưu điểm:
✅ Đơn giản, dễ implement
✅ Data consistency cao
✅ Phù hợp với BTL (Bài tập lớn)
✅ Tránh duplicate venues
✅ Admin kiểm soát chất lượng dữ liệu

#### Nhược điểm:
❌ Organizer phụ thuộc vào Admin
❌ Không linh hoạt cho venues đặc biệt

#### Implementation:

**1. Tạo Admin Venue Management Page**:
```javascript
// frontend/src/pages/admin/AdminVenueManager.jsx
- List venues
- Add new venue
- Edit venue details
- Manage seat sections for each venue
```

**2. Update Event Session Form**:
```javascript
// frontend/src/pages/admin/AdminSessionManagerPage.jsx
// Dropdown chọn venue (thay vì nhập venue_id)
<select name="venue_id">
  {venues.map(v => (
    <option value={v.venue_id}>{v.venue_name} - {v.venue_address}</option>
  ))}
</select>
```

**3. Customer Seat Map View**:
```javascript
// frontend/src/pages/EventDetailPage.jsx
// Hiển thị seat map khi customer chọn session
- Fetch seat sections by venue_id
- Display seat layout (grid/visual)
- Show available seats
```

---

## 2. User Role Management (CUSTOMER ↔ ORGANIZER ↔ BOTH)

### Vấn đề hiện tại:
- User đăng ký với role CUSTOMER
- Khi tạo event → tự động thêm vào bảng Organizer
- NHƯNG không cập nhật User_Type thành 'BOTH'

### Giải pháp:

#### Quy tắc nghiệp vụ:
```
- CUSTOMER tạo event → User_Type = 'BOTH' + thêm vào Organizer table
- ORGANIZER mua vé → User_Type = 'BOTH' + thêm vào Customer table
- User_Type = 'BOTH' → có quyền cả 2 role
```

#### Implementation:

**File: `backend/controllers/event.controller.js`**

```javascript
// Hàm helper để upgrade user role
async function ensureUserRole(conn, userId, targetRole) {
  // targetRole: 'ORGANIZER' hoặc 'CUSTOMER'

  // 1. Lấy current user_type
  const [userRows] = await conn.query(
    `SELECT User_Type FROM User WHERE User_Id = ?`,
    [userId]
  );

  if (userRows.length === 0) {
    throw new Error('User không tồn tại');
  }

  const currentType = userRows[0].User_Type;

  // 2. Determine new type
  let newType = currentType;

  if (targetRole === 'ORGANIZER') {
    if (currentType === 'CUSTOMER') {
      newType = 'BOTH';
    } else if (currentType === 'ORGANIZER') {
      newType = 'ORGANIZER'; // no change
    }
    // currentType === 'BOTH' → no change

    // Thêm vào bảng Organizer nếu chưa có
    await conn.query(
      `INSERT IGNORE INTO Organizer (User_Id) VALUES (?)`,
      [userId]
    );
  }

  if (targetRole === 'CUSTOMER') {
    if (currentType === 'ORGANIZER') {
      newType = 'BOTH';
    } else if (currentType === 'CUSTOMER') {
      newType = 'CUSTOMER'; // no change
    }
    // currentType === 'BOTH' → no change

    // Thêm vào bảng Customer nếu chưa có
    await conn.query(
      `INSERT IGNORE INTO Customer (User_Id) VALUES (?)`,
      [userId]
    );
  }

  // 3. Update User_Type nếu có thay đổi
  if (newType !== currentType) {
    await conn.query(
      `UPDATE User SET User_Type = ? WHERE User_Id = ?`,
      [newType, userId]
    );

    console.log(`User ${userId}: ${currentType} → ${newType}`);
  }

  return newType;
}
```

**Sử dụng trong `adminCreateEvent`**:
```javascript
export async function adminCreateEvent(req, res) {
  const conn = await pool.getConnection();
  try {
    // ...
    await conn.beginTransaction();

    // Đảm bảo user có role ORGANIZER
    await ensureUserRole(conn, user_id, 'ORGANIZER');

    // Tiếp tục tạo event...
    // ...
  }
}
```

**Sử dụng trong `createOrder`** (order.controller.js):
```javascript
export async function createOrder(req, res) {
  const conn = await pool.getConnection();
  try {
    // ...
    await conn.beginTransaction();

    if (actualCustomerId) {
      // Đảm bảo user có role CUSTOMER
      await ensureUserRole(conn, actualCustomerId, 'CUSTOMER');
    }

    // Tiếp tục tạo order...
    // ...
  }
}
```

---

## 3. Venue Pricing Strategy

### Hiện trạng:
- Pricing_Tier: định nghĩa các hạng vé (VIP, Regular, etc.)
- Define_Pricing: map tier → session với giá cụ thể
- **KHÔNG có** link trực tiếp Pricing_Tier → Seat_Section

### Vấn đề:
```
Customer mua vé VIP → không biết ngồi section nào?
Seat_Section có view tốt → giá có khác không?
```

### Giải pháp:

#### Option 1: Link Pricing_Tier → Seat_Section (Phức tạp)
```sql
ALTER TABLE Define_Pricing
ADD COLUMN Section_Id BIGINT,
ADD CONSTRAINT FK_Define_Pricing_Section
  FOREIGN KEY (Section_Id) REFERENCES Seat_Section(Section_Id);
```

**Logic**:
- VIP tier → Section A (view tốt nhất)
- Regular tier → Section B (view bình thường)
- Customer chọn tier → tự động assign section

**Ưu điểm**: Rõ ràng, customer biết chỗ ngồi
**Nhược điểm**: Phức tạp, cần redesign nhiều

#### Option 2: Giữ nguyên - General Admission (Đơn giản)
```
- Customer mua vé theo tier (VIP/Regular)
- Không chọn seat cụ thể
- Check-in → staff assign seat trong section phù hợp
- Hoặc: First come first serve
```

**Ưu điểm**: Đơn giản, không cần sửa schema
**Nhược điểm**: Customer không biết chỗ ngồi trước

**👉 Khuyến nghị: Option 2** (phù hợp BTL)

---

## 4. Summary & Recommendations

### ✅ Implement ngay:

1. **User Role Auto-Upgrade**:
   - Tạo helper function `ensureUserRole()`
   - Apply vào `adminCreateEvent()` và `createOrder()`
   - Test: CUSTOMER tạo event → User_Type = 'BOTH'

2. **Venue Dropdown**:
   - Load venues từ database
   - Replace venue_id input → dropdown select
   - Hiển thị venue_name + address

### 📋 Implement sau (nếu cần):

3. **Admin Venue Management**:
   - CRUD venues
   - Manage seat sections
   - View capacity analytics

4. **Customer Seat Map View**:
   - Visual seat layout
   - Show available/sold seats
   - (Chỉ implement nếu có thời gian)

### ❌ KHÔNG implement (out of scope):

5. **Organizer tạo custom venue**:
   - Quá phức tạp cho BTL
   - Dễ tạo duplicate/inconsistent data
   - Admin control tốt hơn

---

## 5. Sample Code

### File mới cần tạo:

```
backend/utils/userRoleHelper.js  → ensureUserRole() function
frontend/src/pages/admin/AdminVenueManager.jsx  → Venue CRUD (optional)
```

### Files cần sửa:

```
backend/controllers/event.controller.js  → add ensureUserRole() call
backend/controllers/order.controller.js  → add ensureUserRole() call
frontend/src/pages/admin/AdminSessionManagerPage.jsx  → venue dropdown
```

---

## 6. Testing Checklist

- [ ] Customer (user_type=CUSTOMER) tạo event → User_Type becomes 'BOTH'
- [ ] Organizer (user_type=ORGANIZER) mua vé → User_Type becomes 'BOTH'
- [ ] User với User_Type='BOTH' có thể tạo event VÀ mua vé
- [ ] Venue dropdown hiển thị đúng danh sách
- [ ] Session được tạo với venue_id hợp lệ
- [ ] Không có venue_id = NULL trong database

---

**Tác giả**: Claude Code
**Ngày**: 2025-11-28
**Version**: 1.0
