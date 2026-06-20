const view = document.querySelector("#bookingView");
const linkId = location.pathname.split("/").pop();
const fmt = (value) => new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const dateKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
let selected = "";
let selectedDate = "";
let monthCursor;
let bookingData;
const slotCount = (slot) => bookingData.link.slotCounts?.[slot] || 1;
function renderCalendar() {
  const slots = bookingData.link.slots;
  const availableDates = new Set(slots.map(dateKey));
  const todayKey = bookingData.todayKey || dateKey(new Date());
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const cells = Array(new Date(year, month, 1).getDay()).fill(`<span class="calendar-day blank"></span>`);
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const available = availableDates.has(key);
    const pastOrToday = key <= todayKey;
    const future = key > todayKey;
    const count = slots.filter((slot) => dateKey(slot) === key).reduce((sum, slot) => sum + slotCount(slot), 0);
    cells.push(`<button type="button" class="calendar-day ${pastOrToday ? "past-day" : ""} ${future ? "future-day" : ""} ${available ? "available" : ""} ${selectedDate === key ? "chosen" : ""}" data-date="${key}" ${available ? "" : "disabled"}><b>${day}</b>${pastOrToday ? "<i>対象外</i>" : available ? `<i>${count}枠</i>` : ""}</button>`);
  }
  document.querySelector("#calendar").innerHTML = `<div class="calendar-head"><button type="button" id="prevMonth">‹</button><strong>${year}年 ${month + 1}月</strong><button type="button" id="nextMonth">›</button></div><div class="weekdays">${["日","月","火","水","木","金","土"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
  document.querySelector("#prevMonth").onclick = () => { monthCursor = new Date(year, month - 1, 1); renderCalendar(); };
  document.querySelector("#nextMonth").onclick = () => { monthCursor = new Date(year, month + 1, 1); renderCalendar(); };
  document.querySelectorAll(".calendar-day.available").forEach((button) => button.onclick = () => { selectedDate = button.dataset.date; selected = ""; renderCalendar(); renderTimes(); });
}
function renderTimes() {
  const target = document.querySelector("#times");
  const slots = bookingData.link.slots.filter((slot) => dateKey(slot) === selectedDate);
  target.innerHTML = selectedDate ? `<h3>${new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"short"}).format(new Date(`${selectedDate}T12:00:00`))}</h3><div class="time-grid">${slots.map((slot) => `<button type="button" class="time-slot ${selected === slot ? "selected" : ""}" data-slot="${slot}"><strong>${new Intl.DateTimeFormat("ja-JP",{hour:"2-digit",minute:"2-digit"}).format(new Date(slot))}</strong><span>${slotCount(slot)}枠</span></button>`).join("")}</div>` : `<div class="empty">空き枠のある日付を選択してください</div>`;
  document.querySelectorAll(".time-slot").forEach((button) => button.onclick = () => { selected = button.dataset.slot; renderTimes(); document.querySelector("#details").classList.remove("hidden"); });
}
async function load() {
  const response = await fetch(`/api/book/${linkId}`); bookingData = await response.json();
  if (!response.ok) return view.innerHTML = `<div class="empty">${bookingData.error}</div>`;
  monthCursor = bookingData.link.slots.length ? new Date(bookingData.link.slots[0]) : new Date();
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  view.innerHTML = `<div class="booking-intro"><p class="eyebrow">${bookingData.teamName}</p><h1>${bookingData.link.title}</h1><p>空き枠のある日付と時間をお選びください。所要時間は30分~60分程度です。</p></div><form id="bookForm"><div class="calendar-layout"><div id="calendar"></div><div id="times"></div></div><div id="details" class="details hidden"><h2>候補者情報</h2><label>お名前 <small>フルネームでご入力ください</small><input name="candidateName" required placeholder="山田 太郎"></label><button class="primary full">この日時で確定する</button></div></form>`;
  renderCalendar(); renderTimes();
  document.querySelector("#bookForm").onsubmit = submit;
}
async function submit(event) {
  event.preventDefault(); const form = new FormData(event.target);
  const response = await fetch(`/api/book/${linkId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ start: selected, candidateName: form.get("candidateName") }) });
  const result = await response.json();
  if (!response.ok) { alert(result.error); return load(); }
  view.innerHTML = `<div class="success-mark">✓</div><p class="eyebrow">CONFIRMED</p><h1>面接日程が確定しました</h1><p class="success-copy"><strong>${fmt(result.booking.start)}</strong><br>ご予約ありがとうございます。<br>当日朝までにURLをインフラインターンメッセージ上にてお送りいたしますのでご確認くださいませ。</p>${result.calendarError ? `<div class="notice warn">カレンダー登録エラー: ${result.calendarError}</div>` : ""}`;
}
load();
