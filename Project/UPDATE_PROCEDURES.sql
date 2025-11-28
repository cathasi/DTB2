-- ===================================================================
-- SCRIPT CẬP NHẬT DATABASE - SỬA CÁC LỖI
-- ===================================================================
-- Chạy script này để:
-- 1. Sửa lỗi sp_UpdateEventSession không update Available_Seats_Count
-- 2. Thay đổi Session_Status từ Open/Closed sang SCHEDULED/ONGOING/COMPLETED/CANCELLED
-- 3. Cải thiện cal_revenue để hiển thị rõ hơn theo từng hạng vé
-- ===================================================================

USE ticketboxdb;

-- ===================================================================
-- 1. SỬA STORED PROCEDURE sp_UpdateEventSession
-- ===================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_UpdateEventSession//

CREATE PROCEDURE sp_UpdateEventSession(
    IN p_Session_Id BIGINT,
    IN p_Event_Id BIGINT,
    IN p_Venue_Id BIGINT,
    IN p_Start_Date DATETIME,
    IN p_End_Date DATETIME,
    IN p_Open_Date DATETIME,
    IN p_Close_Date DATETIME,
    IN p_Available_Seats_Count BIGINT,
    IN p_Session_Status VARCHAR(20)
)
BEGIN
    DECLARE v_session_exists INT;
    DECLARE v_event_exists INT;
    DECLARE v_venue_exists INT;
    DECLARE v_overlapping_sessions INT;
    DECLARE v_tickets_sold INT;
    DECLARE v_current_status VARCHAR(20);

    -- 1. KIỂM TRA TỒN TẠI
    SELECT COUNT(*), COALESCE(MAX(Session_Status), '')
    INTO v_session_exists, v_current_status
    FROM Event_Session WHERE Session_Id = p_Session_Id;

    IF v_session_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Session_Id không tồn tại';
    END IF;

    -- 2. LOGIC NGHIỆP VỤ
    IF v_current_status IN ('COMPLETED', 'CANCELLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Không thể cập nhật buổi diễn đã kết thúc hoặc hủy';
    END IF;

    SELECT COUNT(*) INTO v_event_exists FROM Event WHERE Event_Id = p_Event_Id;
    IF v_event_exists = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Event_Id không tồn tại'; END IF;

    SELECT COUNT(*) INTO v_venue_exists FROM Venue WHERE Venue_Id = p_Venue_Id;
    IF v_venue_exists = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Venue_Id không tồn tại'; END IF;

    -- Kiểm tra vé đã bán
    SELECT COUNT(*) INTO v_tickets_sold FROM Ticket WHERE Session_Id = p_Session_Id;
    IF v_tickets_sold > 0 AND (p_Venue_Id != (SELECT Venue_Id FROM Event_Session WHERE Session_Id = p_Session_Id)) THEN
         SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Đã có vé bán ra, không thể thay đổi Địa điểm.';
    END IF;

    -- 3. KIỂM TRA THỜI GIAN & TRÙNG LỊCH
    IF p_Start_Date >= p_End_Date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Thời gian bắt đầu phải trước thời gian kết thúc';
    END IF;

    SELECT COUNT(*) INTO v_overlapping_sessions
    FROM Event_Session
    WHERE Venue_Id = p_Venue_Id
      AND Session_Id != p_Session_Id
      AND Session_Status NOT IN ('CANCELLED', 'COMPLETED')
      AND (
          (p_Start_Date >= Start_Date AND p_Start_Date < End_Date) OR
          (p_End_Date > Start_Date AND p_End_Date <= End_Date) OR
          (p_Start_Date <= Start_Date AND p_End_Date >= End_Date)
      );

    IF v_overlapping_sessions > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Trùng lịch với sự kiện khác tại địa điểm này';
    END IF;

    -- 4. UPDATE (ĐÃ THÊM Available_Seats_Count)
    UPDATE Event_Session
    SET Event_Id = p_Event_Id,
        Venue_Id = p_Venue_Id,
        Start_Date = p_Start_Date,
        End_Date = p_End_Date,
        Open_Date = p_Open_Date,
        Close_Date = p_Close_Date,
        Available_Seats_Count = p_Available_Seats_Count,
        Session_Status = p_Session_Status
    WHERE Session_Id = p_Session_Id;

    SELECT 'Cập nhật thành công!' AS Message;
END//

DELIMITER ;

-- ===================================================================
-- 2. SỬA STORED PROCEDURE cal_revenue
-- ===================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS cal_revenue//

CREATE PROCEDURE cal_revenue (
    IN p_event_id BIGINT,
    IN p_min_revenue DECIMAL(15, 2)
)
BEGIN
    -- Tính tổng doanh thu theo từng session và từng hạng vé (Pricing_Tier)
    SELECT
        T.Session_id AS Session_Id,
        ES.Start_Date AS Ngay_Dien,
        T.Ticket_type AS Loai_Ve,
        COUNT(T.Ticket_id) AS So_Ve_Ban_Duoc,
        T.Ticket_Price AS Gia_Ve,
        (T.Ticket_Price * COUNT(T.Ticket_id)) AS Doanh_Thu
    FROM
        TICKET T
    JOIN
        `ORDER` O ON O.Order_Id = T.Order_Id
    JOIN
        PAYMENT P ON P.Order_Id = O.Order_Id
    JOIN
        EVENT_SESSION ES ON T.Session_id = ES.Session_id
    WHERE
        P.payment_status = 'success'
        AND ES.Event_id = p_event_id
    GROUP BY
        T.Session_id,
        ES.Start_Date,
        T.Ticket_type,
        T.Ticket_Price
    HAVING
        Doanh_Thu >= p_min_revenue
    ORDER BY
        T.Session_id ASC,
        T.Ticket_type ASC,
        Doanh_Thu DESC;
END //

DELIMITER ;

-- ===================================================================
-- 3. SỬA STORED PROCEDURE sp_GetOpenSessions
-- ===================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_GetOpenSessions//

CREATE PROCEDURE sp_GetOpenSessions (
    IN p_event_id BIGINT
)
BEGIN
    SELECT
        E.Event_name AS Ten_Su_Kien,
        ES.Session_id AS Ma_Suat_Dien,
        V.Venue_name AS Dia_Diem,
        V.Venue_address AS Dia_Chi,
        ES.Start_date AS Thoi_Gian_Bat_Dau,
        ES.End_date AS Thoi_Gian_Ket_Thuc,
        ES.Available_seats_count AS So_Ghe_Trong
    FROM
        EVENT_SESSION ES
    JOIN
        VENUE V ON ES.Venue_id = V.Venue_id
    JOIN
        EVENT E ON ES.Event_id = E.Event_id
    WHERE
        ES.Event_id = p_event_id
        AND ES.Session_status = 'SCHEDULED'
        AND ES.Start_date > NOW()
    ORDER BY
        ES.Start_date ASC;
END //

DELIMITER ;

-- ===================================================================
-- 4. CẬP NHẬT DỮ LIỆU CŨ (Chuyển trạng thái từ Open/Closed sang SCHEDULED/...)
-- ===================================================================
-- Chuyển tất cả session có status 'Open' thành 'SCHEDULED'
UPDATE Event_Session
SET Session_Status = 'SCHEDULED'
WHERE Session_Status = 'Open';

-- Chuyển tất cả session có status 'Closed' thành 'COMPLETED'
UPDATE Event_Session
SET Session_Status = 'COMPLETED'
WHERE Session_Status = 'Closed';

-- Chuyển tất cả session có status 'Cancelled' thành 'CANCELLED'
UPDATE Event_Session
SET Session_Status = 'CANCELLED'
WHERE Session_Status = 'Cancelled';

-- ===================================================================
-- HOÀN THÀNH
-- ===================================================================
SELECT 'Cập nhật thành công tất cả stored procedures và data!' AS Message;
