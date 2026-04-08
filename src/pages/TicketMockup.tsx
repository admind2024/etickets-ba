import { useState } from "react";
const QRCode = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="white"/>
    <rect x="5" y="5" width="26" height="26" fill="none" stroke="#111" strokeWidth="3.5"/>
    <rect x="11" y="11" width="14" height="14" fill="#111"/>
    <rect x="69" y="5" width="26" height="26" fill="none" stroke="#111" strokeWidth="3.5"/>
    <rect x="75" y="11" width="14" height="14" fill="#111"/>
    <rect x="5" y="69" width="26" height="26" fill="none" stroke="#111" strokeWidth="3.5"/>
    <rect x="11" y="75" width="14" height="14" fill="#111"/>
    {[38,43,48,53,58,63].map(x =>
      [8,13,18,23,28,33,38,43,48,53,58,63,68,73,78,83,88].map(y =>
        Math.sin(x*0.7)*Math.cos(y*0.5) > 0.1 ? <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#111"/> : null
      )
    )}
    {[8,13,18,23,28,33].map(x =>
      [38,43,48,53,58,63,68,73,78,83,88].map(y =>
        Math.cos(x*0.9)*Math.sin(y*0.6) > 0.15 ? <rect key={`b${x}-${y}`} x={x} y={y} width="4" height="4" fill="#111"/> : null
      )
    )}
  </svg>
);
export default function TicketCard() {
  const [checked, setChecked] = useState(false);
  const [shared, setShared] = useState(false);
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f2f5",
      display: "flex",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .phone {
          width: 100%;
          max-width: 390px;
          padding: 12px 14px 28px;
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0 14px;
        }
        .top-title {
          font-size: 16px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.3px;
        }
        .icon-btn {
          width: 34px; height: 34px;
          background: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 6px rgba(0,0,0,0.1);
          cursor: pointer; border: none;
        }
        .card {
          background: white;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 2px 20px rgba(0,0,0,0.09);
        }
        .card-top {
          background: #1846D6;
          padding: 18px 18px 0;
          position: relative;
          overflow: hidden;
        }
        .card-top::after {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 130px; height: 130px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
        }
        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        .event-name {
          font-size: 26px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }
        .ulaz-box {
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.25);
          border-radius: 14px;
          padding: 8px 12px;
          text-align: center;
          flex-shrink: 0;
          min-width: 96px;
        }
        .ulaz-lbl {
          display: block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          margin-bottom: 3px;
        }
        .ulaz-val {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.3px;
        }
        .meta-strip {
          display: flex;
          border-top: 1px solid rgba(255,255,255,0.12);
          margin: 0 -18px;
          padding: 10px 18px;
        }
        .meta-cell {
          flex: 1;
        }
        .meta-cell + .meta-cell {
          border-left: 1px solid rgba(255,255,255,0.12);
          padding-left: 12px;
        }
        .meta-lbl {
          display: block;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          margin-bottom: 3px;
        }
        .meta-val {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        /* Tear */
        .tear {
          display: flex;
          align-items: center;
          background: white;
        }
        .notch {
          width: 20px; height: 20px;
          background: #f0f2f5;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dash {
          flex: 1;
          border-top: 1.5px dashed #e2e5ef;
          margin: 0 2px;
        }
        /* Body */
        .card-body {
          padding: 16px 18px 18px;
        }
        .zone-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .zone-tag {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #1846D6;
          background: #EEF2FF;
          border-radius: 6px;
          padding: 3px 8px;
          margin-bottom: 5px;
        }
        .zone-name {
          font-size: 18px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.4px;
        }
        .zone-sub {
          font-size: 11px;
          color: #999;
          margin-top: 2px;
        }
        .valid-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          border-radius: 100px;
          padding: 5px 11px;
          font-size: 10px;
          font-weight: 800;
          color: #15803d;
          letter-spacing: 0.8px;
          flex-shrink: 0;
        }
        .vdot {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .qr-area {
          background: #f7f8fc;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }
        .qr-box {
          width: 130px; height: 130px;
          background: white;
          border-radius: 10px;
          padding: 7px;
          box-shadow: 0 1px 8px rgba(0,0,0,0.08);
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-top: 1px solid #f0f2f5;
        }
        .info-item label {
          display: block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 3px;
        }
        .info-val {
          font-size: 14px;
          font-weight: 700;
          color: #111;
        }
        .price-val {
          font-size: 20px !important;
          color: #1846D6 !important;
        }
        .btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 12px;
        }
        .btn {
          border: none;
          border-radius: 13px;
          padding: 13px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: transform 0.12s;
          letter-spacing: 0.3px;
        }
        .btn:active { transform: scale(0.96); }
        .btn-share {
          background: #EEF2FF;
          color: #1846D6;
        }
        .btn-checkin {
          background: #1CB865;
          color: white;
          box-shadow: 0 3px 14px rgba(28,184,101,0.35);
        }
        .btn-checkin.done {
          background: #dcfce7;
          color: #15803d;
          box-shadow: none;
        }
        .powered {
          text-align: center;
          margin-top: 14px;
          font-size: 11px;
          color: #ccc;
        }
      `}</style>
      <div className="phone">
        <div className="top-bar">
          <button className="icon-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="top-title">Vaša ulaznica</span>
          <button className="icon-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
        <div className="card">
          <div className="card-top">
            <div className="top-row">
              <div className="event-name">Emina<br/>Jahović</div>
              <div className="ulaz-box">
                <span className="ulaz-lbl">Ulaz</span>
                <span className="ulaz-val">Glavni ulaz</span>
              </div>
            </div>
            <div className="meta-strip">
              <div className="meta-cell">
                <span className="meta-lbl">Datum i vrijeme</span>
                <span className="meta-val">6.3.2026. · 21:00</span>
              </div>
              <div className="meta-cell">
                <span className="meta-lbl" style={{paddingLeft:"12px"}}>Lokacija</span>
                <span className="meta-val" style={{paddingLeft:"12px"}}>Bemax Arena</span>
              </div>
            </div>
          </div>
          <div className="tear">
            <div className="notch"/>
            <div className="dash"/>
            <div className="notch"/>
          </div>
          <div className="card-body">
            <div className="zone-header">
              <div>
                <span className="zone-tag">Slobodno sjeđenje</span>
                <div className="zone-name">Tribina Sjever</div>
                <div className="zone-sub">Sjedite na bilo koje slobodno mjesto</div>
              </div>
              <div className="valid-badge">
                <div className="vdot"/>
                VALIDNA
              </div>
            </div>
            <div className="qr-area">
              <div className="qr-box"><QRCode/></div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <label>Ime i Prezime</label>
                <div className="info-val">Jovana Ristić</div>
              </div>
              <div className="info-item" style={{textAlign:"right"}}>
                <label>Pogled</label>
                <div className="info-val">Jasan pogled</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <label>Cijena</label>
                <div className="info-val price-val">27.50 EUR</div>
              </div>
            </div>
            <div className="btns">
              <button className="btn btn-share" onClick={() => setShared(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {shared ? "Poslano!" : "Podijeli"}
              </button>
              <button className={`btn btn-checkin ${checked?"done":""}`} onClick={() => setChecked(!checked)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {checked ? "Ušao/la ✓" : "Check In"}
              </button>
            </div>
          </div>
        </div>
        <div className="powered">Powered by etickets.ba</div>
      </div>
    </div>
  );
}