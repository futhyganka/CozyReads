# CozyReads — Dự Án Website Quản Lý Thư Viện


<p align="center">
  <strong>Hệ thống quản lý thư viện hiện đại kết hợp trợ lý AI thông minh và thuật toán gợi ý sách cá nhân hóa</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-5.3.0-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-5.3.0-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9.11-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Vue.js-3.5-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/PrimeVue-4.5-41B883?logo=primevue&logoColor=white" alt="PrimeVue" />
  <img src="https://img.shields.io/badge/Google_GenAI-Gemini_API-4285F4?logo=google&logoColor=white" alt="Gemini" />
</p>

---

## 📖 1. Giới Thiệu Dự Án

**CozyReads** là phần mềm quản lý thư viện và mượn sách trực tuyến, được thiết kế theo kiến trúc phân tách rõ ràng giữa **Cổng Độc Giả (Reader Portal)** và **Cổng Quản Trị (Management Portal)**. 

Hệ thống số hóa toàn bộ quy trình vận hành thư viện truyền thống: từ đăng ký thẻ trực tuyến, xác thực email OTP, tìm kiếm & đặt giữ sách 24h, mượn trả tại quầy, quản lý quá hạn & bồi thường mất sách, đến cơ chế tích lũy điểm độc giả tự phục hồi. Bên cạnh đó, CozyReads tiên phong ứng dụng **Trợ lý ảo AI (Google Gemini)** và **Hệ khuyến nghị Item-Based KNN** nhằm mang đến trải nghiệm đọc sách hiện đại, thân thiện và thông minh.

---

## 🛠️ 2. Công Nghệ & Công Cụ Hỗ Trợ (Tech Stack)

### 🔹 Backend
- **Nền tảng & Framework**: [Node.js](https://nodejs.org/) (v20+ / v22+), [Express.js](https://expressjs.com/) (v5.3.0).
- **Cơ sở dữ liệu**: [MongoDB](https://www.mongodb.com/) kết hợp ODM [Mongoose](https://mongoosejs.com/) (v9.11.4).
- **Xác thực & Bảo mật**: 
  - [JSON Web Token (jsonwebtoken)](https://jwt.io/): Cấp phát & giải mã Bearer Token.
  - [Bcryptjs](https://github.com/dcodeIO/bcrypt.js): Băm mật khẩu một chiều kèm Salt (10 rounds).
  - **Crypto** (Node.js built-in): Sinh mã ngẫu nhiên và băm mã OTP bằng HMAC-SHA256, băm token xác nhận bằng SHA-256.
- **Dịch vụ Mail (SMTP)**: [Nodemailer](https://nodemailer.com/) (v10.5.0) gửi email xác thực OTP, thông báo biến động thẻ, nhắc nợ và phản hồi liên hệ.
- **Trí tuệ nhân tạo (AI Engine)**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini API v1beta) hỗ trợ Function Calling tương tác trực tiếp với dữ liệu kho sách thực tế.

### 🔹 Frontend
- **Framework Core**: [Vue 3](https://vuejs.org/) (v3.5.42) sử dụng 100% cú pháp Composition API với `<script setup>`.
- **Build Tool**: [Vite](https://vitejs.dev/) (v8.2.2) cho tốc độ đóng gói và Hot Module Replacement (HMR) cực nhanh.
- **Quản lý Định tuyến**: [Vue Router](https://router.vuejs.org/) (v5.5.1) hỗ trợ Navigation Guards đa tầng bảo vệ route theo quyền.
- **Quản lý Trạng thái (State Management)**: [Pinia](https://pinia.vuejs.org/) (v4.1.0) quản lý phiên đăng nhập kép độc lập.
- **Giao diện & UI Components**:
  - [PrimeVue](https://primevue.org/) (v4.5.5) + [PrimeIcons](https://primefaces.org/primeicons/) (v8.0.2).
  - Theme Preset tùy biến theo nhận diện thương hiệu CozyReads.
- **HTTP Client**: [Axios](https://axios-http.com/) (v1.21.1) với hệ thống Request/Response Interceptors tự động nạp token và xử lý lỗi tập trung.
- **Biểu đồ & Thống kê**: [Chart.js](https://www.chartjs.org/) (v4.6.1) trực quan hóa dữ liệu mượn trả và tài chính.

### 🔹 Công cụ Phát Triển & Kiểm Thử
- **Concurrently**: Chạy đồng thời cả máy chủ Backend và máy chủ Frontend chỉ với 1 lệnh duy nhất.
- **Nodemon**: Tự động reload server Backend khi có thay đổi mã nguồn.
- **Prettier & ESLint**: Chuẩn hóa định dạng mã nguồn và kiểm soát chất lượng code.
- **Test Runner tích hợp**: Bộ kiểm thử tự động toàn diện (Integration & Unit tests) tại `backend/tests/`.

---

## 📂 3. Cấu Trúc Thư Mục Dự Án (Project Structure)

```
CozyReads/
├── backend/                                # MÃ NGUỒN PHÍA MÁY CHỦ (SERVER)
│   ├── scripts/                            
│   │   └── seed-data.js                    # Script khởi tạo dữ liệu mẫu ban đầu
│   ├── src/
│   │   ├── app.js                          # Cấu hình Express App, CORS, Parser & Router
│   │   ├── server.js                       # Entry point: Kết nối DB, khởi chạy Cron & HTTP Server
│   │   ├── api-error.js                    # Custom Error Class chuẩn hóa mã lỗi HTTP
│   │   ├── config/                         # Cấu hình môi trường (.env, database, jwt, mail, ai)
│   │   ├── constants/                      
│   │   │   ├── business-rules.js           # Hằng số thang điểm, hạn mức mượn, chu kỳ thẻ, enums
│   │   │   └── permissions.js              # Bảng ma trận phân quyền (RBAC Matrix)
│   │   ├── controllers/                    # Tầng tiếp nhận HTTP Request & trả JSON Response
│   │   ├── jobs/                           
│   │   │   └── cron-tasks.js               # Các tác vụ chạy nền định kỳ mỗi 24h
│   │   ├── middlewares/                    
│   │   │   ├── auth.middleware.js          # Xác thực JWT, kiểm tra trạng thái tài khoản thời gian thực
│   │   │   └── error.middleware.js         # Bắt và chuẩn hóa toàn bộ lỗi ngoại lệ
│   │   ├── models/                         # Mongoose Models (8 thực thể ERD + 2 helper collections)
│   │   │   ├── danhmuc.model.js            # Danh mục sách
│   │   │   ├── docgia.model.js             # Hồ sơ độc giả, điểm độc giả, hạn thẻ
│   │   │   ├── kythanhtoan.model.js        # Hóa đơn phí gia hạn & bồi thường mất sách
│   │   │   ├── nhanvien.model.js           # Hồ sơ nhân sự thư viện & cờ nghỉ việc
│   │   │   ├── nhaxuatban.model.js         # Nhà xuất bản
│   │   │   ├── otpverification.model.js    # Mã OTP băm HMAC kèm TTL Index tự hủy
│   │   │   ├── phanhoi.model.js            # Liên hệ & Góp ý
│   │   │   ├── registrationtoken.model.js  # Token xác thực trung gian kèm TTL Index
│   │   │   ├── sach.model.js               # Đầu sách & tồn kho khả dụng
│   │   │   ├── tacgia.model.js             # Tác giả
│   │   │   └── theodoimuonsach.model.js    # Phiếu mượn / giữ sách / quá hạn
│   │   ├── routes/                         # Định nghĩa các endpoint RESTful APIs
│   │   └── services/                       # Tầng xử lý logic nghiệp vụ cốt lõi
│   │       ├── auth.service.js             # Nghiệp vụ đăng ký, đăng nhập, sinh mã độc giả
│   │       ├── chat.service.js             # Trợ lý ảo CozySmart (Gemini API & Fallback NLP)
│   │       ├── diem.service.js             # Quản lý thang điểm độc giả, trừ điểm quá hạn, cộng thưởng
│   │       ├── docgia.service.js           # Quản lý độc giả, chu kỳ gia hạn thẻ, khóa thẻ nợ
│   │       ├── goiy.service.js             # Thuật toán Item-Based KNN đề xuất sách
│   │       ├── kythanhtoan.service.js      # Xử lý hóa đơn, xác nhận thu phí, nhắc nợ mail
│   │       ├── mail.service.js             # Dịch vụ gửi email thông báo tự động (Nodemailer)
│   │       ├── muontra.service.js          # Kiểm tra 7 điều kiện mượn, atomic update tồn kho, trả/mất sách
│   │       └── otp.service.js              # Tạo mã OTP, rate limit 60s, tiêu thụ token an toàn
│   └── tests/                              # Hệ thống 14 tệp kiểm thử tự động
│
├── frontend/                               # MÃ NGUỒN GIAO DIỆN (CLIENT SPA)
│   ├── public/                             # Tài nguyên tĩnh công khai (favicon, icons)
│   └── src/
│       ├── main.js                         # Điểm khởi tạo Vue app, Router, Pinia, PrimeVue
│       ├── App.vue                         # Root component chứa Toast, ConfirmDialog & RouterView
│       ├── assets/                         # CSS tokens, hình ảnh logo, avatar bot
│       ├── components/                     # Components tái sử dụng
│       │   ├── chat/CozySmartWidget.vue    # Widget Trợ lý ảo AI nổi ở góc phải màn hình
│       │   ├── common/                     # AvatarCropperDialog, StatusTag
│       │   └── reader/BookCard.vue         # Thẻ hiển thị sách trang chủ & khám phá
│       ├── layouts/                        # Bố cục giao diện
│       │   ├── ReaderLayout.vue            # Navbar & Footer cổng bạn đọc
│       │   ├── ManagementLayout.vue        # Sidebar & Header cổng nhân viên / quản trị
│       │   ├── AccountLayout.vue           # Sidebar trang thông tin cá nhân của độc giả
│       │   └── AuthLayout.vue              # Bố cục khung nhìn đăng nhập / đăng ký
│       ├── router/                         # Vue Router & Navigation Guards bảo vệ route
│       ├── services/                       # Tầng gọi API qua Axios
│       │   └── api.js                      # Cấu hình Axios instance & Dual-Token interceptor
│       ├── stores/                         
│       │   └── auth.store.js               # Pinia store quản lý phiên làm việc độc giả & nhân viên
│       ├── themes/                         # Bộ preset PrimeVue màu nâu ấm cúng (Cozy theme)
│       ├── utils/                          # Hàm format tiền tệ VNĐ, ngày tháng, hằng số nhãn
│       └── views/                          # Toàn bộ màn hình giao diện
│           ├── auth/                       # Đăng nhập, Đăng ký 4 bước, Quên mật khẩu, Nhân viên login
│           ├── reader/                     # Trang chủ, Khám phá, Chi tiết sách, Đang mượn, Lịch sử...
│           ├── management/                 # Quản lý mượn/trả/giữ sách, Quản lý kho sách, Thanh toán...
│           └── system/                     # Trang lỗi 403 Forbidden, 404 Not Found
│
├── .gitignore                              # Cấu hình loại trừ file khi commit Git
├── package.json                            # Root scripts điều phối toàn bộ dự án
└── README.md                               # Tài liệu hướng dẫn sử dụng & triển khai
```

---

## 🌟 4. Tính Năng & Nghiệp Vụ Cốt Lõi

### 👤 4.1. Cổng Độc Giả (Reader Portal)
- **Đăng ký thẻ 4 bước an toàn**: Xác thực email sở hữu qua mã OTP 6 số (chống spam tài khoản).
- **Đăng nhập & Bảo mật**: Hỗ trợ đăng nhập bằng Email hoặc Mã độc giả, đổi mật khẩu, đổi email mới có xác thực OTP, lấy lại mật khẩu khi quên.
- **Khám phá & Tra cứu sách**: Tìm kiếm theo từ khóa (tên, mã, mô tả), bộ lọc nâng cao theo danh mục, tác giả, nhà xuất bản, khoảng giá và tình trạng còn sách trong kho.
- **Hệ thống Gợi ý Sách thông minh (Item-Based KNN)**:
  - Khách chưa đăng nhập: Hiển thị *"Sách nổi bật"* theo số lượt mượn thực tế, luân phiên đa dạng danh mục (Round-Robin Diversification).
  - Độc giả có lịch sử mượn: Hiển thị *"Dành riêng cho bạn"* dựa trên độ tương đồng Cosine giữa các đầu sách.
- **Đặt Giữ Sách Online 24 Giờ**: Độc giả tự giữ chỗ trên website trước khi đến nhận tại quầy. Hệ thống trừ tồn kho chống tình trạng mượn vượt số lượng khả dụng.
- **Theo dõi Thẻ & Điểm độc giả**:
  - Quản lý hạn ngạch mượn theo thang điểm (0–10đ: 0 cuốn; 11–40đ: 1 cuốn; 41–70đ: 2 cuốn; 71–100đ: 3 cuốn).
  - Bạn đọc mượn trả đúng hạn: Cứ mỗi 3 ngày không vi phạm được tự động cộng 1 điểm thưởng (tối đa 100đ).
- **Yêu Cầu Gia Hạn Thẻ & Nộp Minh Chứng**: Chọn gói gia hạn (1, 3, 6 tháng), tải ảnh chụp biên lai chuyển khoản ngân hàng/Ví điện tử để thủ thư duyệt.
- **Trợ Lý Ảo AI (CozySmart)**: Giải đáp quy định thư viện, tìm sách theo tâm trạng và sở thích thông qua đàm thoại tự nhiên.

### 👨‍💼 4.2. Cổng Nhân Viên & Quản Trị Viên (Management Portal)
- **Kiến trúc Xác thực Kép (Dual-Token)**: Token độc giả và nhân viên được lưu độc lập, cho phép đăng nhập đồng thời 2 vai trò trên cùng trình duyệt.
- **Xác thực Quyền Thời gian thực (Real-time Revocation)**: Nếu nhân viên bị đánh dấu nghỉ việc hoặc thẻ độc giả bị tạm khóa, quyền truy cập bị thu hồi ngay lập tức tại middleware.
- **Quản lý Mượn – Trả – Giữ Sách Hợp Nhất**:
  - Xác nhận bàn giao sách cho bạn đọc đã đặt trước online (chuyển sang mượn 14 ngày).
  - Tạo phiếu mượn trực tiếp tại quầy sau khi kiểm tra 7 điều kiện mượn.
  - Tiếp nhận trả sách (hoàn kho, **quá hạn không phạt tiền, chỉ trừ điểm độc giả**).
  - Khai báo mất/hỏng sách: Trừ điểm độc giả gấp đôi, tự động tạo hóa đơn bồi thường bằng đơn giá sách và gửi email thông báo.
- **Quản lý Kho Sách & Danh Mục**: Thêm/sửa/xóa đầu sách, tác giả, thể loại, nhà xuất bản.
- **Quản trị Tài Chính & Thanh Toán**: Đối soát ảnh biên lai chuyển khoản, xác nhận thu tiền mặt, tự động gia hạn thẻ và tự động mở khóa thẻ cho độc giả.
- **Xử lý Ý Kiến Bạn Đọc**: Phản hồi thắc mắc liên hệ trực tiếp đến email của bạn đọc qua giao thức SMTP; quản lý tiến độ xử lý góp ý.
- **Phân Hệ Dành Riêng Cho Quản Trị Viên (Admin)**:
  - Quản lý tài khoản nhân sự (tạo tài khoản, phân chức vụ, thu hồi quyền truy cập).
  - Báo cáo thống kê toàn diện: Biểu đồ phân bổ trạng thái mượn trả, cơ cấu bạn đọc, báo cáo doanh thu tài chính.

### ⚙️ 4.3. Các Tác Vụ Nền Tự Động Hàng Ngày (Cron Tasks)
Chạy tự động mỗi 24 giờ trên máy chủ:
1. **Hủy yêu cầu giữ sách quá 24h**: Hủy các yêu cầu bạn đọc không đến lấy và hoàn lại 1 quyển vào kho khả dụng.
2. **Cập nhật quá hạn**: Chuyển các lượt mượn quá 14 ngày sang trạng thái `quaHan`.
3. **Trừ điểm vi phạm**: Dùng MongoDB Aggregation trừ 1 điểm/ngày/cuốn đối với độc giả có sách quá hạn.
4. **Cộng điểm tích lũy**: Tự động cộng 1 điểm cho độc giả có ý thức tốt sau mỗi 3 ngày không vi phạm.
5. **Gia hạn chu kỳ thẻ**: Tự động cấp thêm 180 ngày miễn phí cho đối tượng Sinh viên/Giảng viên/Nhân viên; tự sinh hóa đơn gia hạn cho độc giả tự do khi đến hạn.
6. **Khóa thẻ nợ phí**: Khóa thẻ độc giả tự do nợ tiền gia hạn quá thời gian ân hạn 7 ngày.

---

## 🗄️ 5. Cơ Sở Dữ Liệu & Thực Thể (Database Schema)

Hệ thống triển khai 8 thực thể dữ liệu chính và 2 collection phụ trợ vận hành:

| Tên Thực Thể | Collection Name | Ý Nghĩa / Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| **`DocGia`** | `docgias` | Quản lý thông tin bạn đọc, điểm độc giả (0–100), hạn dùng thẻ, loại độc giả. |
| **`NhanVien`** | `nhanviens` | Quản lý tài khoản thủ thư/quản trị, chức vụ, mức lương và cờ nghỉ việc. |
| **`Sach`** | `sachs` | Lưu trữ thông tin sách, đơn giá đền bù, số quyển tồn kho khả dụng (`soQuyen`). |
| **`TacGia`** | `tacgias` | Danh sách tác giả sách và quốc tịch. |
| **`DanhMuc`** | `danhmucs` | Phân loại thể loại, chủ đề sách. |
| **`NhaXuatBan`** | `nhaxuatbans` | Danh mục nhà xuất bản và địa chỉ. |
| **`TheoDoiMuonSach`** | `theodoimuonsachs` | Bản ghi mượn/trả/giữ sách (Compound Unique: `{maDocGia, maSach, ngayMuon}`). |
| **`KyThanhToan`** | `kythanhtoans` | Quản lý hóa đơn phí gia hạn thẻ và phí phạt bồi thường sách mất. |
| **`PhanHoi`** | `phanhois` | Lưu trữ các câu hỏi liên hệ và ý kiến góp ý của độc giả. |
| **`OtpVerification`** | `otpverifications` | Lưu mã OTP 6 số băm HMAC SHA-256 kèm TTL Index tự hủy sau 10 phút. |
| **`RegistrationToken`** | `registrationtokens` | Lưu token trung gian băm SHA-256 kèm TTL Index tự hủy sau 15 phút. |

---

## 🚀 6. Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án

### 📋 Yêu cầu tiên quyết
- Đã cài đặt **[Node.js](https://nodejs.org/)** (khuyến nghị phiên bản v20.x, v22.x hoặc mới hơn).
- Đã cài đặt và đang chạy dịch vụ **[MongoDB](https://www.mongodb.com/try/download/community)** (cổng mặc định `27017`).

---

### Bước 1: Clone kho mã nguồn về máy
```bash
git clone https://github.com/futhyganka/CozyReads.git
cd CozyReads
```

---

### Bước 2: Cài đặt Dependencies

Bạn có thể cài đặt lần lượt tại thư mục gốc và các thư mục con:

```bash
# 1. Cài đặt package điều phối tại thư mục gốc (concurrently)
npm install

# 2. Cài đặt dependencies cho Backend
cd backend
npm install

# 3. Cài đặt dependencies cho Frontend
cd ../frontend
npm install

# 4. Quay về thư mục gốc
cd ..
```

---

### Bước 3: Cấu hình Biến Môi Trường (Environment Variables)

#### 1. Cấu hình Backend (`backend/.env`)
Tạo tệp `backend/.env` dựa trên mẫu `backend/.env.example`:

```env
# Cổng chạy ứng dụng Backend
PORT=3000

# Chuỗi kết nối MongoDB
MONGODB_URL=mongodb://127.0.0.1:27017/CozyReads

# Bí mật mã hóa JWT & thời hạn hiệu lực
JWT_SECRET=CozyReads_Super_Secret_Key_2026_Secure
JWT_EXPIRES_IN=7d

# Cấu hình tài khoản gửi Email thông báo tự động (Gmail App Password)
EMAIL_USER=your_library_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Bí mật băm mã OTP (HMAC SHA-256)
OTP_SECRET=CozyReads_Hmac_Otp_Secret_Key_Secure_2026

# Khóa Google Gemini API cho trợ lý ảo CozySmart (Tùy chọn, nếu không có bot sẽ chạy chế độ NLP dự phòng)
GEMINI_API_KEY=your_gemini_api_key_here

# Danh sách nguồn được phép truy cập (CORS Whitelist)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

> **Lưu ý**: Đối với `EMAIL_PASS`, bạn cần tạo **Mật khẩu ứng dụng (App Password)** trong phần Cài đặt Bảo mật tài khoản Google, không dùng mật khẩu Gmail thông thường.

#### 2. Cấu hình Frontend (`frontend/.env`)
Kiểm tra tệp `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

### Bước 4: Khởi tạo Dữ liệu Mẫu (Seed Data)

Chạy script khởi tạo dữ liệu ban đầu (gồm các nhà xuất bản, tác giả, danh mục, sách mẫu, tài khoản Admin, Thủ thư và Độc giả thử nghiệm):

```bash
cd backend
npm run seed
cd ..
```

---

### Bước 5: Khởi Chạy Ứng Dụng

Tại **thư mục gốc** của dự án, khởi chạy đồng thời cả Backend và Frontend chỉ với 1 câu lệnh:

```bash
npm run dev
```

Hệ thống sẽ đồng thời kích hoạt:
- **Backend API Server**: `http://localhost:3000`
- **Frontend Web Application**: `http://localhost:5173`

*(Tùy chọn: Bạn cũng có thể mở 2 terminal riêng biệt: chạy `npm start` trong thư mục `backend/` và `npm run dev` trong thư mục `frontend/`).*

---

## 🔑 7. Tài Khoản Dùng Thử Mặc Định

Sau khi chạy lệnh `npm run seed`, bạn có thể sử dụng ngay các tài khoản sau để trải nghiệm các phân quyền trong hệ thống:

| Vai Trò (Role) | Cổng Đăng Nhập | Tài Khoản / Định Danh | Mật Khẩu Mặc Định | Quyền Hạn Nổi Bật |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `/quan-ly/dang-nhap` | `SA000000` *(hoặc MSNV được tạo)* | `adminPassword123` | Toàn quyền hệ thống, quản lý nhân sự, xem dashboard & báo cáo tài chính. |
| **Thủ thư (Librarian)** | `/quan-ly/dang-nhap` | `SA000001` *(hoặc MSNV được tạo)* | `staffPassword123` | Quản lý mượn trả tại quầy, duyệt giữ sách, duyệt thanh toán, quản lý độc giả và đầu sách. |
| **Độc giả mẫu (Reader)** | `/dang-nhap` | `docgia.an@gmail.com` | `Reader@123` | Tìm kiếm, đặt giữ sách 24h, theo dõi thẻ, thanh toán gia hạn, chat với trợ lý ảo CozySmart. |

---

## 🧪 8. Chạy Kiểm Thử Tự Động (Testing)

Hệ thống CozyReads được trang bị bộ kiểm thử tích hợp chuyên sâu bao quát toàn bộ logic nghiệp vụ (xác thực OTP email, phân quyền RBAC, kiểm tra 7 điều kiện mượn, cập nhật quá hạn, trừ/cộng điểm độc giả, giao dịch thanh toán và thuật toán KNN).

Để chạy toàn bộ bài kiểm thử:

```bash
cd backend
npm test
```

---

## 📄 9. Tác Giả

- **Dự án**: CozyReads — Hệ thống Quản lý Thư viện.
- **Tác giả**: [Thanh Ngân (futhyganka)](https://github.com/futhyganka).
- **Mã nguồn GitHub**: [https://github.com/futhyganka/CozyReads](https://github.com/futhyganka/CozyReads).
