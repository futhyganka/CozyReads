/**
 * Đọc và nén nhẹ file ảnh từ máy tính thành chuỗi Data URL (Base64)
 * giúp lưu trữ gọn nhẹ và hiển thị ngay trên giao diện.
 */
export function readImageFileAsDataUrl(
    file,
    { maxWidth = 600, maxHeight = 900, quality = 0.85 } = {},
) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Chưa chọn tệp hình ảnh.'));
            return;
        }
        if (!file.type || !file.type.startsWith('image/')) {
            reject(
                new Error(
                    'Tệp đã chọn không phải là hình ảnh hợp lệ (chỉ nhận JPG, PNG, WEBP, GIF, SVG).',
                ),
            );
            return;
        }
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSizeBytes) {
            reject(
                new Error(
                    'Kích thước tệp ảnh quá lớn (tối đa 5MB). Vui lòng chọn ảnh nhỏ hơn.',
                ),
            );
            return;
        }

        const reader = new FileReader();
        reader.onerror = () =>
            reject(new Error('Không thể đọc tệp hình ảnh đã chọn.'));
        reader.onload = (e) => {
            const rawDataUrl = e.target?.result;
            // Nếu là ảnh SVG hoặc GIF thì giữ nguyên Data URL gốc
            if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
                resolve(rawDataUrl);
                return;
            }

            const img = new Image();
            img.onerror = () => resolve(rawDataUrl);
            img.onload = () => {
                let { width, height } = img;
                if (width <= maxWidth && height <= maxHeight) {
                    resolve(rawDataUrl);
                    return;
                }

                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const outType =
                    file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(outType, quality));
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    });
}
