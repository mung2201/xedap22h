# XeDap22h E-commerce

Phase 1 đến Phase 13 của hệ thống thương mại điện tử bán xe đạp và phụ kiện.

## Phạm vi đã triển khai

- React + TypeScript + Vite + Ant Design trong `frontend/`.
- NestJS + TypeScript + Mongoose trong `backend/`.
- MongoDB qua biến môi trường và Docker Compose tùy chọn.
- Register, login, logout, logout-all, refresh-token rotation.
- bcrypt password hashing, JWT access token, HTTP-only refresh-token cookie.
- Role Based Access Control: `CUSTOMER`, `STAFF`, `ADMIN`.
- Permission foundation cho STAFF và endpoint kiểm tra RBAC.
- Forgot password, reset password qua Nodemailer.
- Swagger, global validation, Helmet, CORS, rate limit và chuẩn response/error.
- Seed: 1 Admin, 1 Staff, 3 Customer.
- Hồ sơ người dùng: cập nhật họ tên, điện thoại, ngày sinh, giới tính và URL avatar.
- Sổ địa chỉ: thêm, xem, sửa, xóa và đặt địa chỉ mặc định; dữ liệu luôn được giới hạn theo user đăng nhập.
- Catalog: Category nhiều cấp, Brand, Product cho xe đạp/phụ kiện, ảnh, thông số và biến thể màu/size/SKU/tồn kho.
- Customer API: tìm kiếm, filter, sort, pagination, chi tiết và sản phẩm liên quan.
- Admin API/UI: CRUD Category/Brand, tạo và cập nhật Product với RBAC `MANAGE_CATEGORIES`/`MANAGE_PRODUCTS`.
- Pagination response dùng `meta.page`, `meta.limit`, `meta.total`, `meta.totalPages`.
- Customer storefront: Home động, SearchBar toàn cục, Product List query params, filter/sort, gallery ảnh, chọn variant và related products.
- Cart theo từng user: thêm/sửa/xóa/xóa tất cả, tổng tiền do backend tính từ giá Product hiện tại và kiểm tra tồn kho theo variant.
- Wishlist theo từng user: thêm/xóa, kiểm tra trạng thái và chuyển đúng variant còn hàng sang Cart.
- Voucher: CRUD quản trị, mã phần trăm/cố định, điều kiện đơn tối thiểu, thời gian hiệu lực, giới hạn lượt dùng và đếm lượt dùng nguyên tử.
- Checkout: preview do server tính lại theo Cart, Address, Product/Variant, voucher và phí vận chuyển cấu hình qua `.env`.
- COD và payment abstraction: `CodPaymentProvider` hiện dùng cho checkout; `MockOnlinePaymentProvider` đã tách riêng để thay thế bằng gateway thật mà không sửa Order core.
- Order transaction: tạo snapshot bất biến của từng item, trừ tồn kho variant, tăng `soldCount`, dùng voucher và xóa Cart trong cùng MongoDB transaction.
- Customer Order: đặt COD, danh sách đơn có phân trang/lọc trạng thái, xem chi tiết/lịch sử trạng thái và hủy đơn `PENDING` để hoàn tồn kho/lượt voucher.
- Admin Voucher UI: `/admin/vouchers`, bảo vệ bằng `MANAGE_VOUCHERS` ở cả frontend và backend.
- Review: customer chỉ có thể chấm 1–5 sao cho Product nằm trong Order của chính họ đã `DELIVERED`; mỗi `user + product + order` chỉ có một review.
- Product luôn được cập nhật lại `averageRating` và `reviewCount` trong cùng transaction khi Review được tạo; Product Detail có danh sách review công khai và form đánh giá cho đơn đủ điều kiện.
- Size Guide Calculator: customer gửi chiều cao và loại xe để backend truy vấn rule `size_guides` đang active; rule không nằm cố định ở frontend và Admin có thể CRUD bằng quyền `MANAGE_CMS`.
- FAQ Chatbot: keyword matching không dùng AI/LLM; floating widget customer gọi API thật, còn Admin/Staff có `MANAGE_CHATBOT` quản lý câu hỏi, câu trả lời, keywords, priority và trạng thái active.
- Product Recommendation Chatbot: flow `Purpose → Budget → Height → Recommendation` lưu session MongoDB, chọn xe bằng scoring xác định theo loại xe, ngân sách, size guide, tồn kho, rating và giá; không random sản phẩm.
- Dashboard Statistics: KPI doanh thu/đơn hàng/người dùng/tồn kho, series doanh thu liên tục, top sản phẩm/danh mục và date range chuẩn hóa theo múi giờ Việt Nam.

## Phase 8 – Admin Dashboard

- Dashboard quản trị có KPI doanh thu, đơn hàng, khách hàng, sản phẩm, tồn kho thấp/hết hàng; biểu đồ doanh thu theo ngày/tháng, trạng thái đơn, top sản phẩm và top danh mục.
- Admin Order Management: tìm kiếm/lọc/phân trang, xem snapshot item, cập nhật state transition hợp lệ; hủy đơn hoàn stock/voucher trong transaction và lưu status history.
- Admin User Management: tìm kiếm/lọc/phân trang, khóa/mở khóa tài khoản; chỉ ADMIN đổi role hoặc gán permission cho STAFF. STAFF có `MANAGE_USERS` chỉ được thay đổi trạng thái CUSTOMER.
- Sidebar/route frontend và REST API backend đều kiểm tra RBAC. ADMIN vượt qua permission check; STAFF chỉ thấy/gọi được những module được cấp quyền.

Admin routes:

- `/admin/dashboard`
- `/admin/products`, `/admin/categories`, `/admin/brands`, `/admin/vouchers`
- `/admin/orders`, `/admin/orders/:id`
- `/admin/users`

## Phase 9 – CMS

- Một collection `banners` quản lý cả `SLIDER` và `BANNER` bằng trường `type`; hỗ trợ vị trí hiển thị, thứ tự, lịch bắt đầu/kết thúc, trạng thái bật/tắt, ảnh desktop/mobile và link điều hướng.
- Collection `pages` quản lý nội dung tĩnh với `DRAFT`/`PUBLISHED`, slug unique, excerpt và SEO metadata. Public API chỉ trả về trang đã xuất bản.
- Admin CRUD Banner/Slider tại `/admin/banners` và Static Page tại `/admin/pages`, đều yêu cầu permission `MANAGE_CMS` ở frontend lẫn backend.
- Trang chủ lấy hero slider và banner khuyến mãi trực tiếp từ CMS API. Footer liên kết các trang bảo hành, đổi trả, giới thiệu và liên hệ.
- Seed tạo sẵn 4 Static Page: `warranty-policy`, `return-policy`, `about-us`, `contact`; cùng slider/banner mẫu.

## Phase 10 – Size Guide Calculator

- Collection `size_guides` lưu loại xe, khoảng chiều cao, size đề xuất, khoảng size khung, ghi chú, thứ tự ưu tiên và trạng thái active.
- Customer dùng `/size-guide`; frontend chỉ gửi `heightCm` và `bikeType` đến `POST /api/v1/size-guide/recommend`. Backend chọn rule active phù hợp, nên Admin đổi rule sẽ áp dụng ngay mà không cần sửa UI.
- Admin CRUD rule tại `/admin/size-guides`, được bảo vệ bằng `MANAGE_CMS` ở cả frontend lẫn backend.
- Backend chặn khoảng chiều cao không hợp lệ và chặn hai rule active cùng loại xe bị chồng lấn để kết quả tư vấn luôn xác định.
- Seed tạo 15 rule mẫu cho Mountain Bike, Road Bike và City Bike.

## Phase 11 – FAQ Chatbot

- Collection `faq` lưu `question`, `answer`, `keywords[]`, `priority`, `active` cùng metadata người tạo/cập nhật.
- Public API `POST /api/v1/chatbot/message` chuẩn hóa tiếng Việt không dấu, chọn keyword/phrase khớp dài nhất rồi dùng `priority` để phân định kết quả. Response trả `FAQ` hoặc `FALLBACK` kèm các câu hỏi gợi ý active.
- `GET /api/v1/chatbot/suggestions` cung cấp quick replies cho widget; các API công khai chatbot giới hạn 30 request/phút.
- Floating widget hiển thị trong toàn bộ Customer Website, không hard-code câu hỏi FAQ; quick replies và câu trả lời đều lấy từ backend.
- Admin CRUD FAQ tại `/admin/chatbot/faqs`, bảo vệ bằng `MANAGE_CHATBOT` ở frontend và backend.
- Seed tạo 7 FAQ mẫu về bảo hành, đổi trả, phí ship, thời gian giao hàng, địa chỉ, thanh toán và hủy đơn.

## Phase 12 – Product Recommendation Chatbot

- Collection `chatbot_sessions` lưu trạng thái tư vấn public (`PURPOSE`, `BUDGET`, `HEIGHT`, `RESULT`) và tự xóa qua TTL sau một giờ.
- `POST /api/v1/chatbot/recommendation/start` tạo session và trả câu hỏi Purpose; `POST /api/v1/chatbot/recommendation/message` nhận option hoặc chiều cao để đi tiếp flow.
- Backend chỉ xét xe đạp `ACTIVE` có variant còn hàng. Purpose được ánh xạ sang Bike Type; Budget được chấm theo khoảng giá/độ gần ngân sách; chiều cao dùng rule `size_guides` để ưu tiên variant size phù hợp.
- Kết quả sắp xếp xác định theo tổng điểm, điểm purpose, budget, size, rating, stock, giá và tên sản phẩm. API trả tối đa 5 sản phẩm, gồm ảnh, giá, URL, variant phù hợp (nếu có) và lý do cụ thể.
- Floating chatbot có nút **Tư vấn chọn xe**, hiển thị các bước lựa chọn và card 3–5 sản phẩm từ API. Không có product ID, giá hay kết quả mock ở frontend.
- API recommendation public được rate-limit 15 request/phút.

## Phase 13 – Dashboard Statistics

- `GET /api/v1/admin/statistics/dashboard` trả KPI tổng doanh thu, doanh thu hôm nay/tháng/range, đơn hàng, người dùng, sản phẩm, sắp hết hàng và hết hàng; yêu cầu JWT + `VIEW_DASHBOARD`.
- Revenue chỉ tính Order đã `PAID` và không bị hủy. COD được đánh dấu `PAID` khi chuyển `DELIVERED`, nên không bị bỏ sót khỏi số liệu thực thu.
- Hỗ trợ `LAST_7_DAYS`, `LAST_30_DAYS`, `THIS_MONTH`, `THIS_YEAR` và `CUSTOM`. Khoảng custom được hiểu theo ngày tại `Asia/Ho_Chi_Minh` và bao gồm toàn bộ ngày kết thúc.
- Series doanh thu theo ngày/tháng được điền các mốc doanh thu bằng 0 để biểu đồ liên tục; status chart luôn trả đủ trạng thái Order kể cả count bằng 0.
- Dashboard Admin hiển thị revenue chart, order-status chart, top sản phẩm bán chạy, top category, low/out-of-stock, và KPI doanh thu của chính range đang chọn.
- Bổ sung compound index `paymentStatus + orderStatus + createdAt` cho các aggregate doanh thu thường dùng.

## Phase 14 – Thesis completion features

- **Local image upload module**: authenticated customers can upload an avatar; ADMIN/STAFF with product, category, or CMS permission can upload JPEG/PNG/WebP images (5 MB, avatar 2 MB). Files are served from `/uploads/*` in development and are excluded from Git.
- **Bicycle comparison**: customers can add up to three bicycles to a persistent comparison tray, then compare current price, stock, rating, frame, wheel size, weight, variants, and technical specifications at `/compare`.
- **Public order tracking**: `/track-order` accepts an order code and the matching customer/shipping phone number. The server returns only operational statuses and timestamps—never items, address, email, or customer data.
- **After-sales service booking**: authenticated customers can request maintenance, repair, assembly, or bike fitting at `/service-booking`; requests have an immutable status history and email notification. ADMIN/STAFF with `MANAGE_SERVICE_BOOKINGS` process them at `/admin/service-bookings`.
- **Image-aware administration**: Profile, Product, Category, Brand, and Banner forms support direct upload as well as a pasted image URL.

### Test the completion features

1. Log in as a customer, open a bicycle detail page, choose **So sánh xe**, add 2–3 bicycles, then open `/compare`.
2. Open `/track-order`, enter an existing `ORD-...` code and the exact checkout phone. A wrong phone must return the same not-found response.
3. Log in as a customer, open `/service-booking`, create a request for a future date, then verify it appears in **Lịch hẹn của tôi**. It can only be cancelled while `PENDING` or `CONFIRMED`.
4. Log in as ADMIN and open `/admin/service-bookings`; transition `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`, or cancel with a reason. Invalid reverse transitions must be rejected by the API.
5. From Swagger, authorize with a customer token and upload an image through `POST /api/v1/uploads/avatar`; authorize as Admin/Staff with a matching permission for `POST /api/v1/uploads/images`.

## Phase 15 – Product Q&A / Pre-purchase consultation

- Customers can submit a rate-limited product question from a product detail page. Questions are stored with product and customer snapshots, so the support history remains readable even if product content later changes.
- Only answered questions are public. This prevents unmoderated customer text from appearing on the storefront.
- Customers can follow pending, answered, or hidden questions at `/account/questions` and delete only their own pending question.
- ADMIN/STAFF with `MANAGE_PRODUCTS` manage questions at `/admin/product-questions`: reply, edit a reply, reopen, or hide. Answering sends an email notification and publishes the question on the product page.
- New API endpoints: `GET /api/v1/products/:productId/questions`, `POST /api/v1/product-questions`, `GET /api/v1/product-questions/mine`, `DELETE /api/v1/product-questions/:id`, `GET /api/v1/admin/product-questions`, and `PATCH /api/v1/admin/product-questions/:id`.
- The seed now creates answered product questions for selected bicycles, so the public Q&A section is visible immediately after `npm run seed`.

## Requirements

- Node.js 20+ (đã kiểm tra với Node.js 24).
- MongoDB 7+ hoặc MongoDB Atlas.
- Docker Desktop là tùy chọn để chạy MongoDB local.

## Cấu trúc

```text
root/
├─ backend/     # NestJS REST API
├─ frontend/    # React/Vite SPA
├─ docker-compose.yml
└─ README.md
```

## 1. Khởi động MongoDB

Nếu dùng Docker Desktop, chạy tại thư mục root:

```powershell
docker compose up -d mongo
```

MongoDB sẽ chạy ở `mongodb://localhost:27017/bike_store?replicaSet=rs0`.

Hoặc thay `MONGODB_URI` trong `backend/.env` bằng connection string MongoDB Atlas của bạn.

> Checkout/Order dùng MongoDB transaction nên local MongoDB phải chạy dưới dạng Replica Set. `docker-compose.yml` đã khởi tạo replica set `rs0` tự động khi tạo volume mới. Nếu bạn đã có volume Mongo cũ, chạy một lần sau khi container lên:

```powershell
docker exec bike-store-mongo mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

Với MongoDB Atlas, dùng connection string của cluster replica set/cluster hỗ trợ transaction.

## 2. Cấu hình môi trường

Tạo file môi trường từ template:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Trong `backend/.env`, thay hai JWT secret bằng chuỗi dài, riêng tư và không commit file `.env`.

`MAIL_PREVIEW_MODE=true` giúp test Forgot Password mà không cần SMTP: backend sẽ ghi reset URL vào terminal. Để gửi email thật, cấu hình `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` và đổi `MAIL_PREVIEW_MODE=false`.

## 3. Cài và chạy Backend

```powershell
Set-Location backend
npm install
npm run start:dev
```

Backend chạy tại [http://localhost:3000](http://localhost:3000).

Swagger chạy tại [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

## 4. Seed dữ liệu demo

Khi MongoDB đã chạy, mở terminal mới:

```powershell
Set-Location backend
npm run seed
```

Tài khoản seed:

| Role | Email | Username | Password |
|---|---|---|---|
| ADMIN | `admin@example.com` | `admin` | Giá trị `SEED_ADMIN_PASSWORD` trong `.env` |
| STAFF | `staff@example.com` | `staff` | Giá trị `SEED_STAFF_PASSWORD` trong `.env` |
| CUSTOMER | `customer1@example.com` | `customer.one` | Giá trị `SEED_CUSTOMER_PASSWORD` trong `.env` |

Template `.env.example` dùng `ChangeMe123!` chỉ để local demo. Phải thay password này ở môi trường dùng chung hoặc production.

Lệnh seed có thể chạy lại an toàn. Ngoài 5 tài khoản demo, seed tạo category nhiều cấp, 7 brand, 17 sản phẩm mẫu có variant màu/size/tồn kho, voucher `BIKE10`, `FREERIDE100K`, 15 Size Guide rule và 7 FAQ mẫu.

## 5. Chạy Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

Frontend chạy tại [http://localhost:5173](http://localhost:5173).

Các route có thể test ngay:

- `/register`
- `/login`
- `/forgot-password`
- `/reset-password?token=...`
- `/account/profile`
- `/account/addresses`
- `/products`
- `/products/:slug`
- `/size-guide`
- `/cart`
- `/checkout`
- `/order-success?orderId=:id`
- `/account/orders`
- `/account/orders/:id`
- `/admin/login`
- `/admin/dashboard`
- `/admin/products`
- `/admin/products/create`
- `/admin/categories`
- `/admin/brands`
- `/admin/vouchers`
- `/admin/banners`
- `/admin/pages`
- `/admin/size-guides`
- `/admin/chatbot/faqs`
- `/pages/warranty-policy`
- `/pages/return-policy`
- `/pages/about-us`
- `/pages/contact`

### Test Customer Storefront

Sau khi chạy seed và frontend:

1. Mở `/`: Home gọi API category, featured products, sản phẩm mới và sản phẩm giảm giá.
2. Dùng SearchBar trên header hoặc vào `/products?keyword=trek`.
3. Thử filter/sort, ví dụ `/products?category=mountain-bike&color=Black&size=M&inStock=true&sort=price_asc`.
4. Mở một product detail, đổi màu/size và kiểm tra giá cùng tồn kho của variant thay đổi theo dữ liệu API.
5. Kiểm tra phần Related Products ở cuối trang chi tiết.
6. Đăng nhập customer, chọn một màu/size còn hàng ở product detail, sau đó thêm vào Cart. Badge trên header và `/cart` phải cập nhật từ API.
7. Thử tăng số lượng vượt tồn kho tại `/cart`; backend phải từ chối. Giá hiển thị là giá trong response của server, không lấy từ payload frontend.
8. Bấm yêu thích ở product detail, kiểm tra `/account/wishlist`; thử chọn variant và chuyển vào Cart.
9. Tạo ít nhất một địa chỉ ở `/account/addresses`, chọn variant còn tồn kho trong Cart rồi bấm **Tiến hành thanh toán**.
10. Tại `/checkout`, chọn địa chỉ, thử mã `BIKE10` với đơn đạt điều kiện, đổi phương thức giao hàng và đặt COD.
11. Kiểm tra `/account/orders/:id`: item phải giữ nguyên tên/SKU/ảnh/màu/size/đơn giá lúc mua; sau đó hủy khi còn `PENDING` và xác nhận tồn kho + lượt dùng voucher được hoàn lại.
12. Đăng nhập Admin, vào `/admin/vouchers` để thêm/sửa/tắt voucher. Voucher đã dùng không thể hard-delete.
13. Với một Order đã `DELIVERED` của customer, mở Product tương ứng. Nút **Đánh giá sản phẩm** sẽ hiện; gửi 1–5 sao và kiểm tra average rating/review count đổi ngay trên Product Detail.

## 6. Test API bằng Swagger

1. Mở [http://localhost:3000/api/docs](http://localhost:3000/api/docs).
2. Gọi `POST /api/v1/auth/register` hoặc `POST /api/v1/auth/login`.
3. Copy `data.accessToken` trong response.
4. Bấm **Authorize**, dán theo định dạng `Bearer <accessToken>`.
5. Gọi `GET /api/v1/users/me` để kiểm tra JWT guard.
6. Gọi `PATCH /api/v1/users/me` để kiểm tra DTO validation và update profile.
7. Đăng nhập bằng `admin@example.com` hoặc `staff@example.com`, sau đó gọi `GET /api/v1/admin/access-check` để kiểm tra RBAC.
8. Gọi `POST /api/v1/auth/refresh-token`. Swagger chạy cùng origin với API nên refresh cookie sẽ được gửi tự động sau login.
9. Gọi `POST /api/v1/addresses` để tạo địa chỉ; địa chỉ đầu tiên tự động là mặc định.
10. Gọi `GET /api/v1/addresses`, `PATCH /api/v1/addresses/:id` và `PATCH /api/v1/addresses/:id/default` để kiểm tra quản lý sổ địa chỉ.
11. Thử dùng ID địa chỉ của tài khoản khác: API phải trả `404`, không cho đọc/sửa/xóa dữ liệu không thuộc user hiện tại.
12. Chạy `npm run seed`, sau đó gọi public `GET /api/v1/categories`, `GET /api/v1/brands` và `GET /api/v1/products?page=1&limit=12`.
13. Thử filter public: `GET /api/v1/products?category=mountain-bike&bikeType=MOUNTAIN&color=Black&size=M&inStock=true&sort=price_asc`.
14. Đăng nhập bằng Admin, Authorize token rồi gọi `POST /api/v1/admin/products`; category/brand phải là ObjectId hợp lệ và mỗi variant cần SKU riêng.
15. Đăng nhập bằng Staff seed để xác nhận `GET /api/v1/admin/products` được phép, còn `/api/v1/admin/categories` bị chặn nếu Staff chưa có `MANAGE_CATEGORIES`.
16. Sau khi seed và đăng nhập customer, lấy `productId`/`variantId` từ `GET /api/v1/products/:slug`, rồi gọi `POST /api/v1/cart/items` chỉ với `productId`, `variantId`, `quantity`. API sẽ tự trả `unitPrice`, `totalPrice` và `subtotal`.
17. Gọi `PATCH /api/v1/cart/items/:itemId` với số lượng lớn hơn `stock` để xác nhận server trả lỗi; thử productId–variantId không khớp để xác nhận variant bị từ chối.
18. Gọi `POST /api/v1/wishlist/:productId`, `GET /api/v1/wishlist`, và `POST /api/v1/wishlist/:productId/move-to-cart` với `variantId`, `quantity`.
19. Đăng nhập Admin, gọi CRUD `/api/v1/admin/vouchers` để tạo voucher. Dùng `GET /api/v1/products/:slug` và Cart API để có một cart hợp lệ.
20. Đăng nhập Customer, tạo Address rồi gọi `POST /api/v1/checkout/preview`:

```json
{
  "addressId": "<owned-address-id>",
  "voucherCode": "BIKE10",
  "shippingMethod": "STANDARD"
}
```

21. Gọi `POST /api/v1/orders` với payload preview cộng `"paymentMethod": "COD"`. Response phải chứa `items` snapshot, `orderCode`, `statusHistory`, `paymentStatus: "UNPAID"`.
22. Gọi `GET /api/v1/orders/my-orders`, `GET /api/v1/orders/:id`, sau đó `POST /api/v1/orders/:id/cancel` với `{ "reason": "Changed my mind" }`. Hủy chỉ thành công khi status là `PENDING`.
23. Với access token Customer và một Order thuộc user có `orderStatus: "DELIVERED"`, gọi `GET /api/v1/reviews/eligibility/:productId` để lấy `orderId` hợp lệ. Gọi `POST /api/v1/reviews`:

```json
{
  "productId": "<product-id>",
  "orderId": "<delivered-owned-order-id>",
  "rating": 5,
  "comment": "Xe đi rất ổn, đúng mô tả."
}
```

24. Gọi public `GET /api/v1/products/:productId/reviews?page=1&limit=10`; response trả review mới, còn `GET /api/v1/products/:slug` phải phản ánh `averageRating` và `reviewCount` mới.

### Test Admin Dashboard

1. Seed database, đăng nhập `admin@example.com`, copy access token và Authorize trong Swagger.
2. Gọi `GET /api/v1/admin/statistics/dashboard?period=LAST_30_DAYS` để kiểm tra KPI/chart. Thử `period=CUSTOM&startDate=<ISO>&endDate=<ISO>` cho khoảng ngày tùy chọn.
3. Gọi `GET /api/v1/admin/users?page=1&limit=10`, rồi thử `PATCH /api/v1/admin/users/:id/status` với `{ "status": "LOCKED" }` cho một CUSTOMER. Token của user đó sẽ bị vô hiệu hóa qua `tokenVersion`/status.
4. Với ADMIN, thử `PATCH /api/v1/admin/users/:id/role` và `PATCH /api/v1/admin/users/:id/permissions`. Endpoint role/permissions phải trả `403` cho STAFF, kể cả khi STAFF có `MANAGE_USERS`.
5. Gọi `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/:id`, sau đó `PATCH /api/v1/admin/orders/:id/status` với `{ "orderStatus": "CONFIRMED" }`. Chỉ các state transition hợp lệ được chấp nhận. Khi gửi `{ "orderStatus": "CANCELLED", "note": "Customer requested cancellation" }`, backend hoàn stock/voucher một lần.
6. Mở `/admin/dashboard` trên frontend. Đăng nhập Staff seed để xác nhận chỉ menu/API có permission được hiển thị hoặc truy cập.

### Test CMS

1. Chạy `npm run seed`, đăng nhập Admin và mở `/admin/banners`. Tạo Slider với `type: SLIDER`, `position: HOME_HERO`, URL ảnh HTTPS và link `/products`.
2. Tạo Banner với `type: BANNER`, `position: HOME_MIDDLE`; kiểm tra banner xuất hiện trên Home theo `sortOrder` khi active và trong lịch hiển thị.
3. Kiểm tra public API `GET /api/v1/banners?type=SLIDER&position=HOME_HERO`, `GET /api/v1/sliders` và chắc chắn nội dung inactive/hết lịch không được trả về.
4. Mở `/admin/pages`, tạo page `DRAFT` rồi gọi `GET /api/v1/pages/:slug`: API phải trả `404`. Chuyển sang `PUBLISHED` và kiểm tra `/pages/:slug` trên frontend.
5. Với token STAFF không có `MANAGE_CMS`, thử gọi `/api/v1/admin/banners` hoặc `/api/v1/admin/pages`: backend phải trả `403`.

### Test Size Guide Calculator

1. Chạy `npm run seed`, sau đó gọi public `POST /api/v1/size-guide/recommend` với payload:

```json
{
  "heightCm": 170,
  "bikeType": "MOUNTAIN"
}
```

2. Response phải trả một rule Mountain Bike active, với `recommendedSize: "S"` và `frameSizeLabel: "15–16 inch"` từ dữ liệu seed.
3. Mở `/size-guide`, nhập `170` và chọn Mountain Bike; kết quả hiển thị phải khớp API.
4. Đăng nhập Admin, mở `/admin/size-guides`, chỉnh sửa mô tả hoặc frame size của rule 165–172 cm rồi gọi lại API để xác nhận calculator dùng dữ liệu mới từ MongoDB.
5. Thử tạo rule active Mountain Bike `170–175 cm`: API phải trả `409 Conflict` vì chồng lấn rule active hiện hữu. Có thể tạo rule inactive nếu cần lưu bản nháp.
6. Với token STAFF không có `MANAGE_CMS`, gọi `/api/v1/admin/size-guides`: backend phải trả `403`.

### Test FAQ Chatbot

1. Chạy `npm run seed`, sau đó gọi public `GET /api/v1/chatbot/suggestions`: response phải chứa các câu hỏi FAQ active theo `priority`.
2. Gọi `POST /api/v1/chatbot/message`:

```json
{
  "message": "Shop bảo hành bao lâu?"
}
```

3. Response phải có `type: "FAQ"`, câu trả lời bảo hành và các `suggestions`. Thử câu không liên quan để nhận `type: "FALLBACK"` thay vì một câu trả lời ngẫu nhiên.
4. Mở frontend bất kỳ trang customer, bấm nút chat góc dưới phải; các quick replies và phản hồi phải đến từ API. Thử Enter để gửi, Shift+Enter để xuống dòng.
5. Đăng nhập Admin, mở `/admin/chatbot/faqs`, tạo/sửa/tắt FAQ. Một FAQ inactive không được trả về bởi endpoint public và không thể được chatbot match.
6. Với token STAFF không có `MANAGE_CHATBOT`, gọi `/api/v1/admin/chatbot/faqs`: backend phải trả `403`.

### Test Product Recommendation Chatbot

1. Chạy `npm run seed`, sau đó gọi `POST /api/v1/chatbot/recommendation/start`. Lưu `data.sessionId` trong response.
2. Gọi lần lượt `POST /api/v1/chatbot/recommendation/message` với cùng `sessionId`:

```json
{ "sessionId": "<session-id>", "answer": "COMMUTE" }
```

```json
{ "sessionId": "<session-id>", "answer": "FROM_10M_TO_20M" }
```

```json
{ "sessionId": "<session-id>", "answer": "170" }
```

3. Response cuối phải có `type: "RESULT"` và 3–5 `recommendations`, mỗi item gồm `productId`, `name`, `image`, `price`, `salePrice`, `reason`, `productUrl`; với dữ liệu seed, nhu cầu `COMMUTE` sẽ ưu tiên xe City còn hàng.
4. Thử cùng Purpose/Height nhưng Budget khác: thứ hạng hoặc lý do ngân sách phải thay đổi theo scoring, không theo thứ tự ngẫu nhiên. Gửi lại request cuối cùng với cùng session cũng phải cho kết quả xác định.
5. Mở chatbot ở bất kỳ Customer page, bấm **Tư vấn chọn xe**, hoàn thành ba bước và kiểm tra card sản phẩm dẫn đến Product Detail thực tế.
6. Session hết hạn sau một giờ hoặc sessionId sai phải trả `404`; chiều cao ngoài 100–250 cm hay option không hợp lệ phải trả `400`.

### Test Dashboard Statistics

1. Đăng nhập bằng Admin hoặc Staff có `VIEW_DASHBOARD`, Authorize trong Swagger, rồi gọi:

```text
GET /api/v1/admin/statistics/dashboard?period=LAST_7_DAYS
GET /api/v1/admin/statistics/dashboard?period=LAST_30_DAYS
GET /api/v1/admin/statistics/dashboard?period=THIS_MONTH
GET /api/v1/admin/statistics/dashboard?period=THIS_YEAR
```

2. Test custom range với ISO dates:

```text
GET /api/v1/admin/statistics/dashboard?period=CUSTOM&startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z
```

3. Kiểm tra `revenueByDay` luôn có đủ 7 hoặc 30 điểm ở các period tương ứng, gồm cả ngày `revenue: 0`; `revenueByMonth` có đủ tháng giao với range; `ordersByStatus` có đủ mọi status.
4. Chuyển Order COD sang `DELIVERED`, gọi lại API và xác nhận doanh thu/top product/top category tăng theo snapshot order; hủy Order không được tính vào revenue.
5. Mở `/admin/dashboard`, đổi lần lượt 7 ngày, 30 ngày, tháng, năm và custom date range. KPI range, alert, biểu đồ và tables phải cập nhật cùng một period.
6. Token CUSTOMER hoặc STAFF không có `VIEW_DASHBOARD` gọi endpoint phải nhận `403`.

### Test Forgot Password local

1. Gọi `POST /api/v1/auth/forgot-password` với email có thật trong database.
2. Quan sát terminal backend; với preview mode, URL reset được log ra.
3. Lấy token trên query string của URL đó.
4. Gọi `POST /api/v1/auth/reset-password` hoặc mở URL trên frontend.
5. Đăng nhập lại bằng password mới.

## Standard API response

Success:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Invalid email/username or password.",
  "errorCode": "REQUEST_FAILED"
}
```

## Verification commands

```powershell
Set-Location backend
npm run lint
npm run typecheck
npm run build

Set-Location ../frontend
npm run lint
npm run typecheck
npm run build
```

## Security notes

- Password và refresh token chỉ được lưu dạng hash trong MongoDB.
- Refresh token được rotate sau mỗi lần refresh.
- `passwordHash` và reset-token fields được `select: false`.
- Backend không tin role do client gửi; đăng ký luôn tạo `CUSTOMER`.
- ADMIN luôn vượt qua permission check; STAFF cần permission tương ứng.
- Login, register, reset password và forgot password có rate limit.
- Cart không nhận giá từ client; `unitPrice`, line total và subtotal luôn được resolve lại từ Product/Variant hiện tại trên backend.
- Add/update Cart và chuyển Wishlist sang Cart luôn xác thực Product ACTIVE, variant thuộc product và stock hiện tại.
- Checkout không nhận giá, discount, total hay stock từ client. Những giá trị này được resolve lại từ Product/Variant và Voucher trong transaction.
- Tạo/hủy order dùng MongoDB transaction: stock variant, `soldCount`, `Voucher.usedCount`, Order snapshot và Cart được commit/rollback cùng nhau.
- Order chỉ có thể được xem/hủy bởi chủ sở hữu; customer chỉ hủy được `PENDING`. Item snapshot không đổi khi Product được sửa sau đó.
- Review không tin `productId`/`orderId` từ client một cách độc lập: server xác minh Order thuộc user, ở trạng thái `DELIVERED` và thật sự chứa Product trước khi tạo. Unique index chặn review trùng cùng user/product/order.
- Rating Product không lấy từ client; backend aggregate toàn bộ Review của Product và cập nhật `averageRating`/`reviewCount` trong MongoDB transaction.
- Admin order status không nhận transition tùy ý: backend kiểm tra state machine, yêu cầu lý do khi hủy, chỉ hoàn tồn kho/voucher khi chưa hoàn trước đó và ghi nhận người đổi trạng thái.
- API quản trị Users/Orders/Statistics bắt buộc JWT + role/permission guard; frontend chỉ là lớp UX bổ sung, không thay thế backend guard.
- CMS public chỉ trả Banner active trong thời gian hợp lệ và Static Page có `status: PUBLISHED`; toàn bộ thao tác CRUD CMS bắt buộc `MANAGE_CMS` ở backend.
- Size Guide Calculator chỉ dùng rule active từ MongoDB. Backend validate chiều cao, loại xe và cấm những khoảng active chồng lấn theo từng loại xe; frontend không quyết định size.
- FAQ Chatbot không dùng nội dung hay keyword từ client để quyết định câu trả lời. Backend chỉ match trên FAQ active trong MongoDB, chuẩn hóa Unicode/tiếng Việt không dấu và rate-limit API public; toàn bộ CRUD yêu cầu `MANAGE_CHATBOT`.
- Recommendation Chatbot chỉ giữ câu trả lời flow ngắn hạn trong session TTL. Backend tự truy vấn Product/Variant và Size Guide hiện tại, chỉ lấy hàng `ACTIVE` còn stock, tính score server-side và trả kết quả deterministic; client không được gửi product, giá hoặc score để quyết định kết quả.
- Dashboard Statistics tính aggregation server-side với compound index trên Order, chỉ trả dữ liệu cho ADMIN/STAFF có `VIEW_DASHBOARD`. Client chỉ gửi period/date range và không quyết định revenue, order count hay stock metrics.
- Không commit `.env` hoặc key SMTP/JWT/Cloudinary.
