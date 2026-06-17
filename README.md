# NanoDragon Mission Control

Đây là dashboard Next.js để theo dõi vệ tinh **NanoDragon** của Việt Nam.

Ứng dụng lấy TLE mới nhất từ SatNOGS, dùng mô hình **SGP4** để tính vị trí vệ tinh,
đường ground track, footprint và các lần bay qua ground station ở Hà Nội.

## Chạy Project

```bash
npm run dev
```

Mở dashboard:

```txt
http://localhost:3000
```

API nội bộ:

```txt
GET /api/nanodragon
```

## Nguồn TLE Từ SatNOGS

App gọi API SatNOGS DB bằng SatNOGS satellite ID của NanoDragon:

```txt
https://db.satnogs.org/api/tle/?sat_id=ABEW-7076-2438-2471-3995
```

Response từ SatNOGS là một mảng JSON. Phần tử đầu tiên là bộ TLE mới nhất:

```json
[
  {
    "tle0": "0 OBJECT D",
    "tle1": "1 49398U 21102D   26168.05377890  .00009402  00000-0  31989-3 0  9999",
    "tle2": "2 49398  97.3189 210.2672 0008635 193.2732 166.8284 15.30608614254001",
    "tle_source": "Space-Track.org",
    "sat_id": "ABEW-7076-2438-2471-3995",
    "norad_cat_id": 99515,
    "updated": "2026-06-17T09:29:54.955778+0000"
  }
]
```

## Giải Thích Field TLE Từ SatNOGS

| Field | Kiểu | Giải thích |
| --- | --- | --- |
| `tle0` | `string` | Dòng tên/title của TLE. Thường bắt đầu bằng `0`. Với NanoDragon, SatNOGS có thể trả tên generic như `OBJECT D`, nên app tự normalize tên hiển thị thành `NanoDragon`. |
| `tle1` | `string` | Dòng 1 của TLE. Đây là input bắt buộc cho SGP4. Dòng này chứa catalog number, classification, international designator, epoch, đạo hàm mean motion, B* drag term, ephemeris type, element set number và checksum. |
| `tle2` | `string` | Dòng 2 của TLE. Đây cũng là input bắt buộc cho SGP4. Dòng này chứa inclination, RAAN, eccentricity, argument of perigee, mean anomaly, mean motion, revolution number và checksum. |
| `tle_source` | `string` | Nguồn TLE mà SatNOGS đang dùng, ví dụ `Space-Track.org`. |
| `sat_id` | `string` | UUID ổn định của vệ tinh trong SatNOGS. Với NanoDragon nên dùng field này để query: `ABEW-7076-2438-2471-3995`. |
| `norad_cat_id` | `number` | Field NORAD catalog trong SatNOGS. Với NanoDragon hiện đang trả `99515`, trong khi TLE line lại chứa `49398`, nên không nên dùng field này làm lookup chính. |
| `updated` | `string` | Thời điểm SatNOGS cập nhật record TLE. Đây là timestamp UTC có offset. |

Điểm quan trọng: **app dùng `sat_id`, không dùng `norad_cat_id`, để lấy TLE NanoDragon**.

## Response API Nội Bộ

Endpoint:

```txt
GET /api/nanodragon
```

API này không trả raw SatNOGS response trực tiếp. Nó trả dữ liệu đã normalize và dữ liệu đã
tính sẵn để UI có thể render ngay.

Shape tổng:

```ts
type MissionControlData = {
  generatedAt: string;
  tle: TleRecord;
  observer: Observer;
  current: GeoPoint;
  currentLook: LookPoint;
  groundTrack: GeoPoint[];
  prediction: GeoPoint[];
  footprint: FootprintPoint[];
  passes: PassPrediction[];
};
```

## Field Cấp Cao Nhất

| Field | Kiểu | Giải thích |
| --- | --- | --- |
| `generatedAt` | `string` | Thời điểm API tạo response, dạng UTC ISO string. |
| `tle` | `TleRecord` | TLE đã được normalize từ SatNOGS hoặc từ fallback nội bộ nếu SatNOGS lỗi. |
| `observer` | `Observer` | Ground station dùng để tính look angle và pass prediction. Mặc định là Hà Nội. |
| `current` | `GeoPoint` | Vị trí vệ tinh tại thời điểm `generatedAt`. |
| `currentLook` | `LookPoint` | Góc nhìn hiện tại từ ground station đến vệ tinh: azimuth, elevation, range. |
| `groundTrack` | `GeoPoint[]` | Đường đi trên mặt đất từ `now - 45 phút` đến `now + 90 phút`, step 2 phút. |
| `prediction` | `GeoPoint[]` | Dự đoán vị trí trong 1 giờ tới, step 5 phút. |
| `footprint` | `FootprintPoint[]` | Polygon vùng phủ của vệ tinh tại vị trí hiện tại. |
| `passes` | `PassPrediction[]` | Các lần vệ tinh bay qua Hà Nội trong 24 giờ tới, chỉ tính pass vượt qua minimum elevation. |

## `tle`

```ts
type TleRecord = {
  name: string;
  line1: string;
  line2: string;
  source: string;
  satId: string;
  noradCatId: number | null;
  updatedAt: string;
  isFallback: boolean;
};
```

| Field | Kiểu | Giải thích |
| --- | --- | --- |
| `name` | `string` | Tên hiển thị trong app. Hiện normalize thành `NanoDragon`. |
| `line1` | `string` | TLE line 1 được đưa vào `satellite.js` để chạy SGP4. |
| `line2` | `string` | TLE line 2 được đưa vào `satellite.js` để chạy SGP4. |
| `source` | `string` | Nguồn TLE, ví dụ `Space-Track.org`, hoặc label fallback nếu dùng TLE dự phòng. |
| `satId` | `string` | SatNOGS UUID dùng để query vệ tinh. |
| `noradCatId` | `number \| null` | NORAD catalog field SatNOGS trả về, nếu có. Không dùng làm lookup chính cho NanoDragon. |
| `updatedAt` | `string` | Thời điểm TLE upstream được cập nhật. |
| `isFallback` | `boolean` | `false` nếu lấy live từ SatNOGS. `true` nếu SatNOGS lỗi và app đang dùng TLE fallback đã lưu sẵn. |

## `observer`

Ground station dùng để tính pass prediction.

```ts
type Observer = {
  name: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  minElevationDeg: number;
};
```

| Field | Đơn vị | Giải thích |
| --- | --- | --- |
| `name` | text | Tên ground station. |
| `latitude` | độ | Vĩ độ geodetic của ground station. Dương là Bắc. |
| `longitude` | độ | Kinh độ geodetic của ground station. Dương là Đông. |
| `altitudeMeters` | mét | Độ cao ground station so với WGS84 ellipsoid. Khi tính toán sẽ convert sang km. |
| `minElevationDeg` | độ | Góc ngẩng tối thiểu để tính là pass hợp lệ. Mặc định là `10`. |

Mặc định hiện tại:

```json
{
  "name": "Hanoi Ground Station",
  "latitude": 21.0278,
  "longitude": 105.8342,
  "altitudeMeters": 10,
  "minElevationDeg": 10
}
```

## `current`, `groundTrack`, `prediction`

Ba field này đều dùng cùng một kiểu point:

```ts
type GeoPoint = {
  time: string;
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKps: number;
  x: number;
  y: number;
};
```

| Field | Đơn vị | Giải thích |
| --- | --- | --- |
| `time` | UTC ISO string | Thời điểm dùng để propagate TLE bằng SGP4. |
| `lat` | độ | Vĩ độ geodetic WGS84 của vệ tinh sau khi convert từ TEME/ECI-like frame. |
| `lon` | độ | Kinh độ, đã normalize về khoảng `[-180, 180]`. |
| `altitudeKm` | km | Độ cao vệ tinh so với WGS84 ellipsoid. |
| `velocityKps` | km/s | Độ lớn vector vận tốc của vệ tinh. |
| `x` | pixel | Tọa độ ngang trên world map 1440px. |
| `y` | pixel | Tọa độ dọc trên world map 720px. |

Công thức map projection:

```txt
x = ((lon + 180) / 360) * 1440
y = ((90 - lat) / 180) * 720
```

World map chuẩn của project:

```txt
public/maps/world-contour-hires.bmp
```

URL dùng trong app:

```txt
/maps/world-contour-hires.bmp
```

## `currentLook`

Góc nhìn từ ground station đến vệ tinh tại thời điểm hiện tại.

```ts
type LookPoint = {
  time: string;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
};
```

| Field | Đơn vị | Giải thích |
| --- | --- | --- |
| `time` | UTC ISO string | Thời điểm tính look angle. |
| `azimuthDeg` | độ | Hướng từ ground station đến vệ tinh. `0` là Bắc, `90` là Đông. |
| `elevationDeg` | độ | Góc ngẩng so với đường chân trời. Âm nghĩa là vệ tinh đang dưới đường chân trời. |
| `rangeKm` | km | Khoảng cách xiên từ ground station đến vệ tinh. |

## `footprint`

Footprint là vùng mặt đất mà vệ tinh có thể nhìn thấy hoặc phủ sóng tại thời điểm hiện tại.

```ts
type FootprintPoint = {
  lat: number;
  lon: number;
  x: number;
  y: number;
};
```

| Field | Đơn vị | Giải thích |
| --- | --- | --- |
| `lat` | độ | Vĩ độ của một điểm trên vòng footprint. |
| `lon` | độ | Kinh độ của một điểm trên vòng footprint, đã normalize về `[-180, 180]`. |
| `x` | pixel | Tọa độ ngang trên world map 1440px. |
| `y` | pixel | Tọa độ dọc trên world map 720px. |

Hiện implementation vẽ footprint theo đường chân trời, tức minimum elevation bằng `0`.
Riêng pass prediction vẫn dùng `observer.minElevationDeg`.

## `passes`

Các lần vệ tinh bay qua ground station trong 24 giờ tới.

```ts
type PassPrediction = {
  aos: string;
  los: string;
  durationMinutes: number;
  maxElevationDeg: number;
  maxElevationAt: string;
  aosAzimuthDeg: number;
  losAzimuthDeg: number;
  closestRangeKm: number;
};
```

| Field | Đơn vị | Giải thích |
| --- | --- | --- |
| `aos` | UTC ISO string | Acquisition of Signal: thời điểm vệ tinh bắt đầu vượt trên `minElevationDeg`. |
| `los` | UTC ISO string | Loss of Signal: thời điểm vệ tinh rơi xuống dưới `minElevationDeg`. |
| `durationMinutes` | phút | Thời lượng pass từ AOS đến LOS. |
| `maxElevationDeg` | độ | Góc ngẩng cao nhất trong pass. |
| `maxElevationAt` | UTC ISO string | Thời điểm đạt góc ngẩng cao nhất. |
| `aosAzimuthDeg` | độ | Azimuth xấp xỉ lúc AOS. |
| `losAzimuthDeg` | độ | Azimuth xấp xỉ lúc LOS. |
| `closestRangeKm` | km | Khoảng cách xiên tại sample có max elevation. Với dashboard, coi đây là closest range. |

## Pipeline Tính Toán

Vị trí, ground track, footprint:

```txt
SatNOGS TLE
  -> satellite.js twoline2satrec
  -> SGP4 propagate(target time)
  -> TEME/ECI-like position + velocity
  -> GMST
  -> geodetic lat/lon/altitude
  -> map x/y
  -> render dashboard
```

Pass prediction:

```txt
TLE + observer lat/lon/alt
  -> SGP4 mỗi 1 phút trong 24 giờ
  -> ECF position
  -> azimuth/elevation/range
  -> tìm lúc elevation vượt lên/rơi xuống minElevationDeg
```

## Ghi Chú Quan Trọng

- TLE là nguồn dữ liệu chính để tính vị trí, ground track, footprint và pass prediction.
- Không lấy lat/lon thủ công từ third-party rồi vẽ bừa. Luồng đúng là TLE -> SGP4 -> geodetic.
- Với NanoDragon, dùng `sat_id` của SatNOGS để query TLE là ổn định nhất.
- API có fallback TLE để dashboard vẫn render được nếu SatNOGS tạm lỗi.
- Tất cả timestamp trong response nội bộ là UTC string.
- Tọa độ `x/y` trong response được tính cho world map 1440x720 đã chọn.
