// src/pages/EventDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEventDetail } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatPriceWithCurrency } from "../utils/formatPrice.js";

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSessionId, setOpenSessionId] = useState(null); // session đang mở thông tin vé

  useEffect(() => {
    fetchEventDetail(eventId)
      .then((res) => {
        const { event, sessions, pricing_tiers } = res.data;
        setEvent(event);
        setSessions(sessions || []);
        setPricing(pricing_tiers || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [eventId]);

  // Group pricing theo session_id
  const pricingBySession = useMemo(() => {
    const map = {};
    pricing.forEach((p) => {
      const sid = p.session_id || p.Session_Id;
      if (!sid) return;
      if (!map[sid]) map[sid] = [];
      map[sid].push(p);
    });
    return map;
  }, [pricing]);

  // Session sớm nhất
  const earliestSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    return sessions.reduce((min, s) => {
      const d = new Date(s.Start_Date || s.start_datetime);
      const md = new Date(min.Start_Date || min.start_datetime);
      return d < md ? s : min;
    }, sessions[0]);
  }, [sessions]);

  const extraSessionsCount = sessions.length > 1 ? sessions.length - 1 : 0;

  // Giá min: ưu tiên dùng event.min_price (để trùng Homepage)
  const minPrice = useMemo(() => {
    if (event && (event.min_price || event.Min_Price)) {
      return event.min_price ?? event.Min_Price;
    }
    if (!pricing || pricing.length === 0) return null;
    return pricing.reduce((min, t) => {
      const value = t.price ?? t.base_price ?? 0;
      return value < min ? value : min;
    }, pricing[0].price ?? pricing[0].base_price ?? 0);
  }, [event, pricing]);

  const formatTimeRange = (session) => {
    const start = new Date(session.Start_Date || session.start_datetime);
    const end = new Date(session.End_Date || session.end_datetime);

    const timeStr = `${start.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${end.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const dateStr = start.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return { timeStr, dateStr };
  };

  const handleScrollSchedule = () => {
    const el = document.getElementById("schedule-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleBuyNow = (session) => {
    // Yêu cầu login trước khi mua vé
    if (!currentUser) {
      navigate("/login", { state: { from: `/events/${eventId}` } });
      return;
    }

    const sid = session.session_id || session.Session_Id;
    const tiers = pricingBySession[sid] || [];

    navigate("/checkout", {
      state: {
        event,
        selectedSession: session,
        tiers,              // ⭐ gửi luôn list hạng vé của session
      },
    });
  };

  const toggleSessionPricing = (sessionId) => {
    setOpenSessionId((cur) => (cur === sessionId ? null : sessionId));
  };

  if (loading) return <p>Đang tải sự kiện...</p>;
  if (!event) return <p>Không tìm thấy sự kiện.</p>;

  const formattedMinPrice = minPrice > 0
    ? formatPriceWithCurrency(minPrice)
    : "Đang cập nhật";

  const heroTime =
    earliestSession && formatTimeRange(earliestSession).timeStr;
  const heroDate =
    earliestSession && formatTimeRange(earliestSession).dateStr;

  return (
    <div className="event-detail-page">
      {/* HERO: info bên trái, hình bên phải */}
      <section className="event-hero">
        {/* LEFT */}
        <div className="event-hero-left">
          <h1 className="event-title">
            {event.event_name || event.Event_Name}
          </h1>

          {/* Thời gian */}
          {earliestSession && (
            <div className="event-hero-row">
              <div className="event-hero-icon">📅</div>
              <div>
                <div className="event-hero-time">{heroTime}</div>
                <div className="event-hero-extra">
                  {heroDate}
                  {extraSessionsCount > 0 && (
                    <span className="event-hero-extra-tag">
                      + {extraSessionsCount} ngày khác
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Địa điểm (venue của session sớm nhất) */}
          {earliestSession && (
            <div className="event-hero-row">
              <div className="event-hero-icon">📍</div>
              <div>
                <div className="event-hero-venue-name">
                  {earliestSession.Venue_Name ||
                    earliestSession.venue_name}
                </div>
                {earliestSession.Venue_Address ||
                  (earliestSession.venue_address && (
                    <div className="muted text-xs">
                      {earliestSession.Venue_Address ||
                        earliestSession.venue_address}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Giá từ */}
          <div className="event-hero-price-row">
            <span className="event-hero-price-label">Giá từ</span>
            <span className="event-hero-price-value">
              {formattedMinPrice}
            </span>
          </div>

          {/* Nút chọn lịch diễn */}
          <button
            className="btn btn-primary"
            style={{ marginTop: 12, width: "200px" }}
            onClick={handleScrollSchedule}
          >
            Chọn lịch diễn
          </button>
        </div>

        {/* RIGHT - poster */}
        <div className="event-hero-right">
          {event.poster_image || event.Poster_Image ? (
            <img
              src={event.poster_image || event.Poster_Image}
              alt={event.event_name || event.Event_Name}
            />
          ) : (
            <div className="event-hero-placeholder">
              Không có poster
            </div>
          )}
        </div>
      </section>

      {/* GIỚI THIỆU */}
      <section className="section-card">
        <h2 className="section-title">Giới thiệu</h2>
        <p style={{ whiteSpace: "pre-line" }}>
          {event.event_description || event.Event_Description}
        </p>
      </section>

      {/* LỊCH DIỄN + HẠNG VÉ */}
      <section className="section-card" id="schedule-section">
        <div className="section-header-row">
          <h2 className="section-title">Lịch diễn</h2>
        </div>

        <div className="session-list">
          {sessions.map((s) => {
            const { timeStr, dateStr } = formatTimeRange(s);
            const sid = s.session_id || s.Session_Id;
            const tiers = pricingBySession[sid] || [];

            // trạng thái / số ghế để demo "Hết vé"
            const status = s.session_status || s.Session_Status;
            const available =
              s.available_seats_count ?? s.Available_Seats_Count;
            const isSoldOut =
              status === "Closed" ||
              status === "Cancelled" ||
              available === 0;

            return (
              <div key={sid} className="session-item">
                {/* HEADER của session */}
                <div className="session-header">
                  <div
                    className="session-header-left"
                    onClick={() => toggleSessionPricing(sid)}
                  >
                    <span
                      className={
                        openSessionId === sid
                          ? "chevron open"
                          : "chevron"
                      }
                    >
                      ▾
                    </span>
                    <div>
                      <div className="session-time">{timeStr}</div>
                      <div className="session-date">{dateStr}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      isSoldOut
                        ? "btn btn-soldout"
                        : "btn btn-primary"
                    }
                    disabled={isSoldOut}
                    onClick={() => {
                      if (!isSoldOut) handleBuyNow(s);
                    }}
                  >
                    {isSoldOut ? "Hết vé" : "Mua vé ngay"}
                  </button>
                </div>

                {/* Thông tin vé */}
                {openSessionId === sid && (
                  <div className="session-body">
                    <div className="ticket-info-title">
                      Thông tin vé
                    </div>
                    <div className="ticket-tier-list">
                      {tiers.length === 0 && (
                        <p className="muted text-xs">
                          Hiện chưa có cấu hình hạng vé cho lịch diễn
                          này.
                        </p>
                      )}

                      {tiers.map((t) => (
                        <div
                          key={t.tier_id || t.Tier_Id}
                          className="ticket-tier-item"
                        >
                          <div className="ticket-tier-name">
                            {(t.tier_name || t.Tier_Name || "").toUpperCase()}
                          </div>
                          <div className="ticket-tier-right">
                            <div className="ticket-tier-price">
                              {formatPriceWithCurrency(t.price ?? t.base_price ?? 0)}
                            </div>

                            { (s.available_seats_count ?? s.Available_Seats_Count) === 0 && (
                              <div className="ticket-tier-status sold-out">Hết vé</div>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sessions.length === 0 && (
            <p className="muted">
              Hiện chưa có lịch diễn cho sự kiện này.
            </p>
          )}
        </div>
      </section>

      {/* BAN TỔ CHỨC - demo đơn giản */}
      <section className="section-card">
        <h2 className="section-title">Ban tổ chức</h2>
        <p className="muted">
          (Bạn có thể thêm cột Organizer trong DB và hiển thị thông tin chi
          tiết ở đây, ví dụ tên brand, mô tả, link fanpage, ...)
        </p>
      </section>
    </div>
  );
}
