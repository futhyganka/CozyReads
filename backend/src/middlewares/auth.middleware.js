const ApiError = require('../api-error');
const { ROLE_PERMISSIONS, ROLES } = require('../constants/permissions');

/**
 * Middleware phân quyền dựa vào Permissions Matrix
 * @param {string} requiredPermission
 */
function checkPermission(requiredPermission) {
    return (req, res, next) => {
        // req.user được gán từ JWT middleware hoặc session
        // Mặc định nếu chưa đăng nhập là KHACH
        const userRole = req.user?.maVaiTro || ROLES.KHACH;
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        if (!permissions.includes(requiredPermission)) {
            return next(
                new ApiError(
                    403,
                    `Truy cập bị từ chối. Vai trò [${userRole}] không có quyền [${requiredPermission}].`,
                ),
            );
        }

        next();
    };
}

module.exports = { checkPermission };
