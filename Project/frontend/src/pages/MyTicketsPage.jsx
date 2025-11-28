// src/pages/MyTicketsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getMyTickets, callCustomerTicketCountFn } from "../services/api.js";
import { formatPriceWithCurrency } from "../utils/formatPrice.js";

export default function MyTicketsPage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho phần thống kê số vé
  const [ticketCountForm, setTicketCountForm] = useState({
    startDate: "",
    endDate: "",
  });
  const [ticketCountResult, setTicketCountResult] = useState(null);
  const [ticketCountError, setTicketCountError] = useState("");
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    getMyTickets(currentUser.user_id)
      .then((res) => setTickets(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleTicketCountChange = (e) => {
    const { name, value } = e.target;
    setTicketCountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTicketCount = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setTicketCountError("Bạn cần đăng nhập để xem thống kê.");
      return;
    }

    setTicketCountError("");
    setLoadingCount(true);
    setTicketCountResult(null);

    try {
      const res = await callCustomerTicketCountFn({
        customerId: currentUser.user_id,
        startDate: ticketCountForm.startDate || null,
        endDate: ticketCountForm.endDate || null,
      });

      const data = res.data;
      const value =
        data?.ticket_count ??
        data?.total_tickets ??
        data?.value ??
        data?.count ??
        0;

      setTicketCountResult(value);
    } catch (err) {
      console.error(err);
      setTicketCountError(
        err?.response?.data?.message ||
          "Không đếm được số vé. Kiểm tra lại hàm count_customer_tickets và API."
      );
    } finally {
      setLoadingCount(false);
    }
  };

  if (loading) return <p>Đang tải vé...</p>;

  return (
    <div className="space-y-6">
      {/* Phần thống kê số vé đã mua */}
      <div className="card">
        <h2 className="section-title mb-2">
          Thống kê số vé đã mua (count_customer_tickets)
        </h2>
        <p className="muted text-sm mb-3">
          Gọi hàm <code>count_customer_tickets(p_customer_id, p_start_date, p_end_date)</code>{" "}
          để đếm số vé có trạng thái <code>PAID</code> hoặc{" "}
          <code>CHECKED_IN</code> trong khoảng thời gian.
        </p>

        <form className="space-y-3" onSubmit={handleSubmitTicketCount}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Từ ngày
              </label>
              <input
                type="datetime-local"
                name="startDate"
                className="input w-full"
                value={ticketCountForm.startDate}
                onChange={handleTicketCountChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Đến ngày
              </label>
              <input
                type="datetime-local"
                name="endDate"
                className="input w-full"
                value={ticketCountForm.endDate}
                onChange={handleTicketCountChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loadingCount}
          >
            {loadingCount ? "Đang tính..." : "Đếm số vé"}
          </button>
        </form>

        {ticketCountError && (
          <div className="text-red-600 text-sm mt-2 whitespace-pre-line">
            {ticketCountError}
          </div>
        )}

        {ticketCountResult !== null && !ticketCountError && (
          <div className="mt-3 p-3 rounded bg-gray-50">
            <p className="text-sm">
              Tổng số vé của bạn:
            </p>
            <p className="text-xl font-semibold">
              {ticketCountResult.toLocaleString("vi-VN")} vé
            </p>
          </div>
        )}
      </div>

      {/* Danh sách vé */}
      <div className="my-ticket-card">
        <h1 className="text-xl font-semibold mb-3">Danh sách vé của tôi</h1>

        {tickets.length === 0 ? (
          <p className="muted">
            Bạn chưa có vé nào.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Sự kiện</th>
                  <th>Ngày</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.ticket_id}>
                    <td>{t.event_name}</td>
                    <td>{t.session_date}</td>
                    <td>{formatPriceWithCurrency(t.ticket_price)}</td>
                    <td>{t.ticket_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
