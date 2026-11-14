import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'cr_auth_token';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

let onUnauthorizedCallback = null;

export function registerUnauthorizedHandler(cb) {
    onUnauthorizedCallback = cb;
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const serverMessage = error.response?.data?.message;

        if (status === 401) {
            const url = error.config?.url || '';
            const isLoginEndpoint =
                url.includes('/auth/dang-nhap-doc-gia') ||
                url.includes('/auth/dang-nhap-nhan-vien');

            if (!isLoginEndpoint && onUnauthorizedCallback) {
                onUnauthorizedCallback(
                    serverMessage || 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
                );
            }
        }

        const normalizedError = new Error(
            serverMessage ||
                (status === 403
                    ? 'Bạn không có quyền thực hiện thao tác này.'
                    : status === 404
                      ? 'Không tìm thấy dữ liệu yêu cầu.'
                      : status === 500
                        ? 'Lỗi hệ thống máy chủ. Vui lòng thử lại sau.'
                        : error.message || 'Không thể kết nối đến máy chủ.'),
        );
        normalizedError.statusCode = status || 500;
        normalizedError.raw = error.response?.data;

        return Promise.reject(normalizedError);
    },
);

export default api;
