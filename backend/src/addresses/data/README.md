# Danh mục địa chỉ Việt Nam

`vietnam-locations.json` là dữ liệu tham chiếu lưu trong dự án. Website không gọi API địa chỉ bên thứ ba khi người dùng chọn nơi giao hàng.

Nguồn: [Vietnamese Provinces Database — Thang Le Quoc](https://github.com/thanglequoc/vietnamese-provinces-database). Tác giả tổng hợp từ dữ liệu của Cục Thống kê; đây là dự án cộng đồng, không phải API của cơ quan nhà nước. Giấy phép MIT được giữ nguyên trong `LICENSE.vietnamese-provinces-database.txt`.

## Phiên bản đã ghim

Ngày tải và kiểm tra: **29/09/2026**.

| Nhánh dữ liệu | Bản phát hành | Mốc áp dụng của nguồn | Số tỉnh/thành | Số quận/huyện | Số phường/xã/đặc khu |
|---|---|---|---:|---:|---:|
| `current` | `v5.2.0` | 20/09/2026 | 34 | Không có cấp huyện | 3.321 |
| `legacy` | `v2.4.1` | 01/03/2025, trước sáp nhập 07/2025 | 63 | 696 | 10.035 |

- Current commit: `62b1abdfe39625289c37a58ef6678e9db3d37f84`.
- Legacy commit: `fc33b7411ec4e3697817fab8118718a8d39ef090`.
- [JSON nguồn current](https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/62b1abdfe39625289c37a58ef6678e9db3d37f84/json/vn_only_simplified_json_generated_data_vn_units_minified.json).
- [JSON nguồn legacy](https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/fc33b7411ec4e3697817fab8118718a8d39ef090/json/vn_only_simplified_json_generated_data_vn_units_minified.json).
- [Metadata current](https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/62b1abdfe39625289c37a58ef6678e9db3d37f84/json/vn_provinces_metadata.json).

Nguồn chính thức dùng đối chiếu cơ cấu và các thay đổi tên cấp tỉnh đã có hiệu lực tại ngày tải:

- [Quyết định 19/2025/QĐ-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160): danh mục hai cấp, hiệu lực 01/07/2025.
- [Nghị quyết 30/2026/QH16](https://chinhphu.vn/?classid=1&docid=218009&pageid=27160): thành phố Đồng Nai, hiệu lực 30/04/2026.
- [Nghị quyết 36/2026/QH16](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-36-2026-qh16-thanh-lap-thanh-pho-quang-ninh-tu-1-9-2026-119260903082603583.htm): thành phố Quảng Ninh, hiệu lực 01/09/2026.
- [Nghị quyết 39/2026/QH16](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-39-2026-qh16-thanh-lap-thanh-pho-bac-ninh-tu-20-9-2026-11926090308214813.htm): thành phố Bắc Ninh, hiệu lực 20/09/2026.
- [Danh sách nghị quyết của Cục Thống kê](https://danhmuchanhchinh.nso.gov.vn/NghiDinh.aspx): bao gồm 388/NQ-UBTVQH16, hiệu lực 20/09/2026.

## Cấu trúc và chuyển đổi

```ts
type Unit = { code: string; name: string };
type Catalog = {
  current: (Unit & { wards: Unit[] })[];
  legacy: (Unit & { districts: (Unit & { wards: Unit[] })[] })[];
};
```

Giữ nguyên `Code` dưới dạng chuỗi và `FullName` tiếng Việt từ nguồn, lần lượt đổi khóa thành `code` và `name`. Chuyển `Wards` của current thành `wards`; chuyển `District`/`Ward` của legacy thành `districts`/`wards`. Chỉ bỏ các trường mã cha và bưu chính đã dư thừa trong cây lồng nhau. Mảng `null` trong nguồn chuyển thành `[]`. Không tự suy đoán hoặc đổi địa danh.

Legacy có năm huyện không chia cấp xã: Bạch Long Vĩ (`318`), Cồn Cỏ (`471`), Hoàng Sa (`498`), Lý Sơn (`536`), Côn Đảo (`755`). Các huyện này có `wards: []`; không thêm phường/xã giả để ép đủ ba cấp.

Đã kiểm tra tổng số bản ghi, mã duy nhất theo từng cấp/phiên bản, mã tỉnh/huyện/xã dài 2/3/5 chữ số và toàn bộ quan hệ mã cha của nguồn. Đây là kiểm tra tính toàn vẹn dữ liệu; không phải đối chiếu thủ công từng địa danh với từng nghị quyết.

## SHA-256

```text
current source: 1c2c0a3e2e204fc39b4624cf9c5c6ae116761385bfd2a092599400e7ac4c0eaa
legacy source:  07f533191e94f29d9f59e430122e345672a4a236ad457cfdf114c07ebcc41bd8
normalized:     ae1e2cdee6d5d1587caa94cb9760a819651b4e3dbaada93c46dc3525d0bd416d
```

Đây là snapshot có phiên bản, không tự cập nhật. Khi thay dữ liệu, ghim commit mới, kiểm tra ngày hiệu lực, giữ mã và tên của phiên bản cũ cho các địa chỉ đã lưu; cập nhật số lượng, nguồn và hash tại đây.
