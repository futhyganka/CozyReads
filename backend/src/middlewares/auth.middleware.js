const jwt = require('jsonwebtoken');
const ApiError = require('../api-error');
const config = require('../config');
const { ROLE_PERMISSIONS, ROLES } = require('../constants/permissions');
const { NhanVien, DocGia } = require('../models');

/**
 * Middleware trích xuất và xác thực JWT token (nếu có)
 * Hoặc nhận role từ header x-user-role (cho mục đích test/internal)
 * Thu hồi quyền ngay lập tức nếu nhân viên đã bị đánh dấu nghỉ việc (daNghiViec = true)
 * hoặc thẻ độc giả bị tạm khóa/hủy.
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            let decoded;
            try {
                decoded = jwt.verify(token, config.jwt.secret);
            } catch {
                return next(new ApiError(401, 'Token không hợp lệ hoặc đã hết hạn.'));
            }

            // Kiểm tra trạng thái mới nhất từ database
            if (decoded.role === ROLES.NHANVIEN || decoded.role === ROLES.QUANTRIVIEN) {
                const nhanVien = await NhanVien.findById(decoded._id);
                if (!nhanVien || nhanVien.daNghiViec) {
                    return next(
                        new ApiError(
                            401,
                            'Tài khoản nhân viên đã bị vô hiệu hóa hoặc đã nghỉ việc. Quyền truy cập bị thu hồi.',
                        ),
                    );
                }
            } else if (decoded.role === ROLES.DOCGIA) {
                const docGia = await DocGia.findById(decoded._id);
                if (docGia && (docGia.trangThaiTaiKhoan === 'tamKhoa' || docGia.trangThaiTaiKhoan === 'daHuy')) {
                    return next(
                        new ApiError(
                            403,
                            `Thẻ độc giả đang ở trạng thái [${docGia.trangThaiTaiKhoan}]. Quyền truy cập bị tạm dừng.`,
                        ),
                    );
                }
            }

            req.user = decoded;
            return next();
        }

        // Mặc định là khách vãng lai (đã loại bỏ header x-user-role để chống giả mạo quyền)
        req.user = { maVaiTro: ROLES.KHACH, role: ROLES.KHACH };
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Middleware yêu cầu người dùng phải đăng nhập
 */
function requireAuth(req, res, next) {
    if (!req.user || !req.user.maVaiTro || req.user.maVaiTro === ROLES.KHACH) {
        return next(new ApiError(401, 'Vui lòng đăng nhập để thực hiện thao tác này.'));
    }
    next();
}

/**
 * Middleware phân quyền dựa vào Permissions Matrix
 * Cho phép truyền 1 hoặc nhiều permissions (logic OR: người dùng có ít nhất 1 quyền sẽ được phép)
 * @param {...string} requiredPermissions
 */
function checkPermission(...requiredPermissions) {
    return (req, res, next) => {
        const userRole = req.user?.maVaiTro || req.user?.role || ROLES.KHACH;
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        const hasPermission = requiredPermissions.some((p) => permissions.includes(p));
        if (!hasPermission) {
            return next(
                new ApiError(
                    403,
                    `Truy cập bị từ chối. Vai trò [${userRole}] không có quyền [${requiredPermissions.join(' hoặc ')}].`,
                ),
            );
        }

        next();
    };
}

module.exports = {
    authenticate,
    requireAuth,
    checkPermission,
};
