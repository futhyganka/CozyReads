const { Sach, TheoDoiMuonSach } = require('../models');
const { TRANG_THAI_MUON } = require('../constants/business-rules');

/**
 * Trạng thái mượn sách hợp lệ theo quy định nghiệp vụ:
 * ĐIỀU KIỆN TIÊN QUYẾT: Sách ĐÃ ĐƯỢC GIAO TẬN TAY ĐỘC GIẢ.
 * 
 * 1. DANG_MUON: Độc giả đã nhận sách tại quầy (bởi thủ thư xác nhận).
 * 2. DA_TRA: Độc giả đã mượn và hoàn tất trả sách về kho.
 * 3. QUA_HAN: Độc giả đang cầm sách nhưng đã quá ngày hẹn trả.
 * 4. DA_MAT: Sách đang mượn bị mất hoặc hỏng (độc giả đã từng nhận sách).
 * 5. DA_BOI_THUONG: Đã nộp phạt đền bù cho cuốn sách bị mất/hỏng.
 * 
 * TUYỆT ĐỐI LOẠI BỎ:
 * - YEU_CAU_GIU_SACH: Độc giả mới bấm giữ chỗ online 24h, THỦ THƯ CHƯA GIAO SÁCH.
 * - DA_HUY: Yêu cầu giữ chỗ bị hủy do quá 24h hoặc độc giả hủy, CHƯA TỪNG GIAO SÁCH.
 */
const TRANG_THAI_MUON_HOP_LE = [
    TRANG_THAI_MUON.DANG_MUON,
    TRANG_THAI_MUON.DA_TRA,
    TRANG_THAI_MUON.QUA_HAN,
    TRANG_THAI_MUON.DA_MAT,
    TRANG_THAI_MUON.DA_BOI_THUONG,
];

// In-memory cache 2 tầng riêng biệt:
// 1. Cache ma trận tương tác độc giả - sách (KNN Matrix)
let _cachedMatrixData = null;
let _cachedMatrixAt = 0;

// 2. Cache danh sách sách đang khả dụng trong kho (Available Books)
let _cachedAvailableBooks = null;
let _cachedBooksAt = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

class GoiYService {
    /**
     * Xóa cache ma trận tương tác độc giả - sách (khi có lượt giao sách mới)
     */
    static xoaCacheMaTran() {
        _cachedMatrixData = null;
        _cachedMatrixAt = 0;
    }

    /**
     * Xóa cache danh sách sách khả dụng (khi có thay đổi số lượng tồn kho hoặc thông tin sách)
     */
    static xoaCacheSach() {
        _cachedAvailableBooks = null;
        _cachedBooksAt = 0;
    }

    /**
     * Xóa toàn bộ cache (tương thích ngược)
     */
    static xoaToanBoCache() {
        this.xoaCacheMaTran();
        this.xoaCacheSach();
    }

    static xoaCache() {
        this.xoaToanBoCache();
    }

    /**
     * Lấy dữ liệu ma trận tương tác độc giả - sách từ MongoDB
     * Có cache in-memory để tối ưu hiệu năng
     */
    static async layDuLieuTuongTac({ forceReload = false } = {}) {
        const now = Date.now();
        if (
            !forceReload &&
            _cachedMatrixData &&
            now - _cachedMatrixAt < CACHE_TTL_MS
        ) {
            return _cachedMatrixData;
        }

        // Truy xuất các lượt mượn hợp lệ đã thực tế giao sách
        const phieuMuons = await TheoDoiMuonSach.find({
            trangThai: { $in: TRANG_THAI_MUON_HOP_LE },
        })
            .select('_id maDocGia maSach trangThai createdAt')
            .lean();

        // readersByBook: Map<sachId, Set<docGiaId>> (cho ma trận nhị phân tương tác)
        // booksByReader: Map<docGiaId, Set<sachId>> (tập sách độc giả đã từng mượn)
        // borrowCountByBook: Map<sachId, number> (tổng số lượt mượn hợp lệ thực tế)
        const readersByBook = new Map();
        const booksByReader = new Map();
        const borrowCountByBook = new Map();

        // Chống đếm trùng: Mỗi document trong TheoDoiMuonSach đại diện cho 1 lượt mượn duy nhất
        const daXuLyPhieuIds = new Set();

        for (const p of phieuMuons) {
            if (!p.maDocGia || !p.maSach) continue;
            const phieuId = p._id.toString();
            if (daXuLyPhieuIds.has(phieuId)) continue;
            daXuLyPhieuIds.add(phieuId);

            const uid = p.maDocGia.toString();
            const bid = p.maSach.toString();

            // 1. Đếm số lượt mượn thực tế theo đầu sách
            borrowCountByBook.set(
                bid,
                (borrowCountByBook.get(bid) || 0) + 1,
            );

            // 2. Ghi nhận tương tác nhị phân (Độc giả mượn cùng 1 cuốn nhiều lần vẫn chỉ tính = 1 nhờ cấu trúc Set)
            if (!booksByReader.has(uid)) {
                booksByReader.set(uid, new Set());
            }
            booksByReader.get(uid).add(bid);

            if (!readersByBook.has(bid)) {
                readersByBook.set(bid, new Set());
            }
            readersByBook.get(bid).add(uid);
        }

        _cachedMatrixData = {
            readersByBook,
            booksByReader,
            borrowCountByBook,
            totalValidBorrows: daXuLyPhieuIds.size,
        };
        _cachedMatrixAt = now;

        return _cachedMatrixData;
    }

    /**
     * Tính độ tương đồng Cosine giữa 2 vector nhị phân của 2 cuốn sách
     * Cosine(i, j) = |Readers(i) ∩ Readers(j)| / ( sqrt(|Readers(i)|) * sqrt(|Readers(j)|) )
     */
    static tinhCosineSimilarity(readersA, readersB) {
        if (!readersA || !readersB || readersA.size === 0 || readersB.size === 0) {
            return 0;
        }

        // Tích vô hướng: số độc giả chung mượn cả 2 cuốn sách
        let giaoDiem = 0;
        const [smaller, larger] =
            readersA.size < readersB.size
                ? [readersA, readersB]
                : [readersB, readersA];

        for (const uid of smaller) {
            if (larger.has(uid)) {
                giaoDiem++;
            }
        }

        if (giaoDiem === 0) return 0;

        const normA = Math.sqrt(readersA.size);
        const normB = Math.sqrt(readersB.size);
        const mauSo = normA * normB;

        return mauSo === 0 ? 0 : giaoDiem / mauSo;
    }

    /**
     * Lấy danh sách các sách còn khả dụng trong kho (soQuyen > 0), có cache riêng biệt
     */
    static async layDanhSachSachKhaDung({ forceReload = false } = {}) {
        const now = Date.now();
        if (
            !forceReload &&
            _cachedAvailableBooks &&
            now - _cachedBooksAt < CACHE_TTL_MS
        ) {
            return _cachedAvailableBooks;
        }

        const sachs = await Sach.find({ soQuyen: { $gt: 0 } })
            .populate('tacGia', 'tenTg maTG quocTich')
            .populate('danhMuc', 'tenDm maDM')
            .populate('maNXB', 'tenNxb maNXB diaChi')
            .lean();

        _cachedAvailableBooks = sachs;
        _cachedBooksAt = now;
        return _cachedAvailableBooks;
    }

    /**
     * Lấy danh sách sách phổ biến dựa trên số lượt mượn thực tế hợp lệ,
     * ưu tiên đa dạng hóa danh mục theo vòng tròn (Round-Robin).
     */
    static chonSachPhoBien({
        allBooks,
        borrowCountByBook,
        excludeBookIds = new Set(),
        limit = 10,
    }) {
        const candidates = allBooks.filter(
            (b) => !excludeBookIds.has(b._id.toString()),
        );

        if (candidates.length === 0) return [];

        const enriched = candidates.map((b) => ({
            ...b,
            _borrowCount: borrowCountByBook.get(b._id.toString()) || 0,
        }));

        // Gom nhóm theo danh mục
        const byCategory = new Map();
        for (const book of enriched) {
            const catId = book.danhMuc?._id?.toString() || 'unknown';
            if (!byCategory.has(catId)) {
                byCategory.set(catId, []);
            }
            byCategory.get(catId).push(book);
        }

        // Trong từng danh mục, sắp xếp sách theo số lượt mượn giảm dần, tie-breaker: createdAt mới hơn
        for (const list of byCategory.values()) {
            list.sort((a, b) => {
                if (b._borrowCount !== a._borrowCount) {
                    return b._borrowCount - a._borrowCount;
                }
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
        }

        // Lấy sách luân phiên qua các danh mục (Round-Robin Diversification)
        const result = [];
        const categoryQueues = Array.from(byCategory.values());
        let hasMore = true;

        while (result.length < limit && hasMore) {
            hasMore = false;
            for (const queue of categoryQueues) {
                if (queue.length > 0) {
                    result.push(queue.shift());
                    hasMore = true;
                    if (result.length >= limit) break;
                }
            }
        }

        return result;
    }

    /**
     * API cốt lõi gợi ý sách:
     * - Khách chưa đăng nhập -> Tiêu đề: "Sách nổi bật"
     * - Độc giả có ít nhất 1 kết quả KNN (từ 1 cuốn trở lên) -> Tiêu đề: "Dành riêng cho bạn"
     * - Độc giả chưa mượn hoặc không tìm được láng giềng -> Tiêu đề: "Gợi ý cho bạn"
     */
    static async layGoiYSach({ docGiaId = null, limit = 10 } = {}) {
        const matrixData = await this.layDuLieuTuongTac();
        const allBooks = await this.layDanhSachSachKhaDung();

        // -------------------------------------------------------------
        // TRƯỜNG HỢP A: KHÁCH CHƯA ĐĂNG NHẬP
        // -------------------------------------------------------------
        if (!docGiaId) {
            const popularBooks = this.chonSachPhoBien({
                allBooks,
                borrowCountByBook: matrixData.borrowCountByBook,
                excludeBookIds: new Set(),
                limit,
            });

            return {
                title: 'Sách nổi bật',
                subtitle:
                    'Những cuốn sách được yêu thích tại CozyReads, biết đâu bạn sẽ tìm thấy cuốn sách dành cho mình.',
                caseType: 'A',
                loaiGoiY: 'popular',
                data: popularBooks,
                total: popularBooks.length,
            };
        }

        // Độc giả đã đăng nhập: lấy danh sách sách độc giả đã từng mượn
        const targetUserId = docGiaId.toString();
        const userBorrowedBooks =
            matrixData.booksByReader.get(targetUserId) || new Set();

        // -------------------------------------------------------------
        // TRƯỜNG HỢP KHÔNG CÓ KẾT QUẢ KNN: ĐỘC GIẢ CHƯA TỪNG MƯỢN SÁCH NÀO
        // -------------------------------------------------------------
        if (userBorrowedBooks.size === 0) {
            const fallbackBooks = this.chonSachPhoBien({
                allBooks,
                borrowCountByBook: matrixData.borrowCountByBook,
                excludeBookIds: new Set(),
                limit,
            });

            return {
                title: 'Gợi ý cho bạn',
                subtitle:
                    'Tuyển chọn những cuốn sách dành riêng cho hành trình khám phá tri thức của bạn.',
                caseType: 'C_fallback',
                loaiGoiY: 'popular',
                data: fallbackBooks,
                total: fallbackBooks.length,
            };
        }

        // -------------------------------------------------------------
        // ITEM-BASED KNN CHO ĐỘC GIẢ ĐÃ CÓ LỊCH SỬ MƯỢN SÁCH
        // -------------------------------------------------------------
        const availableBooksMap = new Map();
        for (const book of allBooks) {
            availableBooksMap.set(book._id.toString(), book);
        }

        const K_NEIGHBORS = 10;
        const candidateScores = new Map(); // Map<sachId, totalSimilarityScore>

        for (const borrowedBookId of userBorrowedBooks) {
            const readersOfBorrowed =
                matrixData.readersByBook.get(borrowedBookId);
            if (!readersOfBorrowed || readersOfBorrowed.size === 0) continue;

            const neighborsOfI = [];

            for (const [candidateId, readersOfCandidate] of matrixData.readersByBook.entries()) {
                // Bỏ qua sách chính nó hoặc độc giả đã từng mượn
                if (
                    candidateId === borrowedBookId ||
                    userBorrowedBooks.has(candidateId)
                ) {
                    continue;
                }

                // Bỏ qua sách đã hết tồn kho khả dụng
                if (!availableBooksMap.has(candidateId)) {
                    continue;
                }

                const sim = this.tinhCosineSimilarity(
                    readersOfBorrowed,
                    readersOfCandidate,
                );

                if (sim > 0) {
                    neighborsOfI.push({ candidateId, sim });
                }
            }

            neighborsOfI.sort((a, b) => b.sim - a.sim);
            const topKNeighbors = neighborsOfI.slice(0, K_NEIGHBORS);

            for (const n of topKNeighbors) {
                const currentScore = candidateScores.get(n.candidateId) || 0;
                candidateScores.set(n.candidateId, currentScore + n.sim);
            }
        }

        // Xếp hạng các sách ứng viên theo điểm KNN giảm dần
        const rankedCandidates = Array.from(candidateScores.entries())
            .map(([sachId, score]) => {
                const book = availableBooksMap.get(sachId);
                const borrowCount =
                    matrixData.borrowCountByBook.get(sachId) || 0;
                return {
                    ...book,
                    _score: score,
                    _borrowCount: borrowCount,
                };
            })
            .sort((a, b) => {
                if (b._score !== a._score) {
                    return b._score - a._score;
                }
                if (b._borrowCount !== a._borrowCount) {
                    return b._borrowCount - a._borrowCount;
                }
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

        // -------------------------------------------------------------
        // TRƯỜNG HỢP KHÔNG CÓ KẾT QUẢ KNN: SÁCH ĐÃ MƯỢN CHƯA CÓ LÁNG GIỀNG NÀO CÓ SIM > 0
        // -------------------------------------------------------------
        if (rankedCandidates.length === 0) {
            const fallbackBooks = this.chonSachPhoBien({
                allBooks,
                borrowCountByBook: matrixData.borrowCountByBook,
                excludeBookIds: userBorrowedBooks,
                limit,
            });

            return {
                title: 'Gợi ý cho bạn',
                subtitle:
                    'Tuyển chọn những cuốn sách dành riêng cho hành trình khám phá tri thức của bạn.',
                caseType: 'C_fallback',
                loaiGoiY: 'popular',
                data: fallbackBooks,
                total: fallbackBooks.length,
            };
        }

        // -------------------------------------------------------------
        // TRƯỜNG HỢP CÓ KẾT QUẢ KNN (Từ 1 cuốn trở lên -> Đều là cá nhân hóa):
        // Tiêu đề thống nhất: "Dành riêng cho bạn"
        // -------------------------------------------------------------
        const knnResults = rankedCandidates.slice(0, limit);

        // Nếu đã đủ limit từ KNN
        if (knnResults.length >= limit) {
            return {
                title: 'Dành riêng cho bạn',
                subtitle:
                    'Khám phá những cuốn sách được gợi ý dựa trên hành trình đọc của bạn.',
                caseType: 'B',
                loaiGoiY: 'knn',
                data: knnResults,
                total: knnResults.length,
            };
        }

        // Nếu ít hơn limit cuốn -> Bổ sung sách phổ biến chưa từng mượn để đủ danh sách
        const excludeIds = new Set([
            ...userBorrowedBooks,
            ...knnResults.map((b) => b._id.toString()),
        ]);

        const additionalBooks = this.chonSachPhoBien({
            allBooks,
            borrowCountByBook: matrixData.borrowCountByBook,
            excludeBookIds: excludeIds,
            limit: limit - knnResults.length,
        });

        const hybridResults = [...knnResults, ...additionalBooks];

        return {
            title: 'Dành riêng cho bạn',
            subtitle:
                'Khám phá những cuốn sách được gợi ý dựa trên hành trình đọc của bạn.',
            caseType: 'B',
            loaiGoiY: 'hybrid',
            data: hybridResults,
            total: hybridResults.length,
        };
    }
}

module.exports = GoiYService;
