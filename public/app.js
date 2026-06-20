const $ = (q) => document.querySelector(q);
const fmt = (value) => new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
let state;
let availabilityMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let availabilityDate = "";
let pendingAvailability = [];
let manageAvailabilityMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let manageAvailabilityDate = "";
let interviewerPanelOpen = false;

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "content-type": "application/json" }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
const empty = (text) => `<div class="empty">${text}</div>`;
const commonUrl = () => `${state.baseUrl.replace("localhost", "127.0.0.1")}/book/all`;
const interviewerName = (id) => state.interviewers.find((item) => item.id === id)?.name || "面接官";
const todayLocalKey = () => localDateKey(new Date());
const datetimeLocalValue = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const dateLabel = (value) => new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
const timeLabel = (value) => new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function fillInterviewerSelects() {
  document.querySelectorAll(".interviewer-select").forEach((select) => {
    select.innerHTML = `<option value="">選択してください</option>` + state.interviewers.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
  });
}
function renderAvailabilityCalendar() {
  const year = availabilityMonth.getFullYear();
  const month = availabilityMonth.getMonth();
  const cells = Array(new Date(year, month, 1).getDay()).fill(`<span class="calendar-day blank"></span>`);
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = pendingAvailability.filter((value) => value.startsWith(key)).length;
    const pastOrToday = key <= todayLocalKey();
    cells.push(`<button type="button" class="calendar-day admin-day ${pastOrToday ? "past-day" : ""} ${availabilityDate === key ? "chosen" : ""} ${count ? "has-slots" : ""}" data-date="${key}" ${pastOrToday ? "disabled" : ""}><b>${day}</b>${pastOrToday ? "<i>対象外</i>" : count ? `<i>${count}枠</i>` : ""}</button>`);
  }
  $("#availabilityCalendar").innerHTML = `<div class="calendar-head"><button type="button" id="adminPrevMonth">‹</button><strong>${year}年 ${month + 1}月</strong><button type="button" id="adminNextMonth">›</button></div><div class="weekdays">${["日","月","火","水","木","金","土"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
  $("#adminPrevMonth").onclick = () => { availabilityMonth = new Date(year, month - 1, 1); renderAvailabilityCalendar(); };
  $("#adminNextMonth").onclick = () => { availabilityMonth = new Date(year, month + 1, 1); renderAvailabilityCalendar(); };
  document.querySelectorAll(".admin-day").forEach((button) => button.onclick = () => {
    availabilityDate = button.dataset.date;
    $("#availabilityDateLabel").textContent = `${Number(availabilityDate.slice(5,7))}月${Number(availabilityDate.slice(8,10))}日の時間設定`;
    renderAvailabilityCalendar();
  });
}
function renderAvailabilityPreview() {
  $("#availabilityPreview").innerHTML = pendingAvailability.length ? pendingAvailability.sort().map((value) => `<button type="button" class="slot-tag pending-slot" data-value="${value}">${fmt(value)} ×</button>`).join("") : `<span class="muted-small">日付を選んで10:00-20:00の60分枠を追加してください</span>`;
  document.querySelectorAll(".pending-slot").forEach((button) => button.onclick = () => {
    pendingAvailability = pendingAvailability.filter((value) => value !== button.dataset.value);
    renderAvailabilityPreview(); renderAvailabilityCalendar();
  });
}
function openAvailability(interviewerId = "") {
  pendingAvailability = [];
  availabilityDate = "";
  availabilityMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  $("#availabilityModal").showModal();
  if (interviewerId) $("#availabilityForm [name=interviewerId]").value = interviewerId;
  $("#availabilityDateLabel").textContent = "日付を選択してください";
  renderAvailabilityCalendar();
  renderAvailabilityPreview();
}
function renderManageAvailabilityCalendar(slotsByDate) {
  const year = manageAvailabilityMonth.getFullYear();
  const month = manageAvailabilityMonth.getMonth();
  const today = todayLocalKey();
  const firstSlotDate = Object.keys(slotsByDate)[0] || "";
  if (!manageAvailabilityDate && firstSlotDate) manageAvailabilityDate = firstSlotDate;
  const cells = Array(new Date(year, month, 1).getDay()).fill(`<span class="calendar-day blank"></span>`);
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = slotsByDate[key]?.length || 0;
    cells.push(`<button type="button" class="calendar-day manage-day ${key <= today ? "past-day" : "future-day"} ${count ? "available" : ""} ${manageAvailabilityDate === key ? "chosen" : ""}" data-date="${key}" ${count ? "" : "disabled"}><b>${day}</b>${count ? `<i>${count}枠</i>` : ""}</button>`);
  }
  $("#availabilityManageCalendar").innerHTML = `<div class="calendar-head"><button type="button" id="managePrevMonth">‹</button><strong>${year}年 ${month + 1}月</strong><button type="button" id="manageNextMonth">›</button></div><div class="weekdays">${["日","月","火","水","木","金","土"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
  $("#managePrevMonth").onclick = () => { manageAvailabilityMonth = new Date(year, month - 1, 1); render(); };
  $("#manageNextMonth").onclick = () => { manageAvailabilityMonth = new Date(year, month + 1, 1); render(); };
  document.querySelectorAll(".manage-day").forEach((button) => button.onclick = () => { manageAvailabilityDate = button.dataset.date; render(); });
}
function renderInterviewerPanel() {
  $("#interviewerPanel").classList.toggle("collapsed-panel", !interviewerPanelOpen);
  $("#interviewerTools").classList.toggle("hidden", !interviewerPanelOpen);
  $("#toggleInterviewers").textContent = interviewerPanelOpen ? "面接官設定を閉じる" : "面接官設定を開く";
}
async function copyCommonLink(button) {
  await navigator.clipboard.writeText(commonUrl());
  const before = button.textContent;
  button.textContent = "コピーしました";
  setTimeout(() => button.textContent = before, 1600);
}
async function render() {
  state = await api("/api/state");
  $("#bookingCount").textContent = state.bookings.length;
  $("#teamName").value = state.settings.teamName || "";
  $("#calendarEmail").value = state.settings.calendarEmail || "frt.shibuya@gmail.com";
  $("#notificationEmail").value = state.settings.notificationEmail || "frt.shibuya@gmail.com";
  $("#googleButton").classList.toggle("connected", state.google.connected);
  $("#googleButton").innerHTML = state.google.connected ? "✓ Googleカレンダー連携済み" : "G&nbsp; Googleカレンダー連携";
  $("#calendarConnectButton").classList.toggle("connected", state.google.connected);
  $("#calendarConnectButton").innerHTML = state.google.connected ? "✓ Googleカレンダー連携済み" : "G&nbsp; Googleカレンダーと連携する";
  const ordered = [...state.interviewers].sort((a, b) => a.priority - b.priority);
  $("#interviewers").innerHTML = ordered.length ? ordered.map((person, index) => {
    const slots = state.availabilities.filter((item) => item.interviewerId === person.id).sort((a,b) => new Date(a.start)-new Date(b.start));
    const upcoming = slots.slice(0, 3).map((slot) => `<button class="slot-tag delete-availability" data-id="${slot.id}" title="クリックで削除">${fmt(slot.start)} ×</button>`).join("");
    return `<article class="row interviewer-row"><div class="priority-badge">${person.priority}</div><div class="avatar">${person.name.slice(0,1)}</div><div class="row-main"><strong>${person.name}</strong><span>${person.email || "メール未登録"} ・ ${person.meetUrl ? "固定Meetリンク登録済み" : "固定Meetリンク未登録"} ・ 空き枠 ${slots.length}件 ・ 優先順位 ${person.priority}</span><div class="email-editor"><input type="email" class="interviewer-email" data-id="${person.id}" value="${person.email || ""}" placeholder="通知先メールアドレス"><input type="url" class="interviewer-meet" data-id="${person.id}" value="${person.meetUrl || ""}" placeholder="固定Meetリンク"><button class="copy save-email" data-id="${person.id}">保存</button></div><div class="slot-tags">${upcoming}${slots.length > 3 ? `<em>ほか${slots.length - 3}件</em>` : ""}</div></div><div class="row-actions"><button class="copy priority-up" data-id="${person.id}" data-priority="${person.priority}" ${index === 0 ? "disabled" : ""}>上へ</button><button class="copy priority-down" data-id="${person.id}" data-priority="${person.priority}" ${index === ordered.length - 1 ? "disabled" : ""}>下へ</button><button class="copy add-for-person" data-id="${person.id}">空き枠</button><button class="delete delete-interviewer" data-id="${person.id}">削除</button></div></article>`;
  }).join("") : empty("まず面接官を追加してください");
  const slotsByDate = state.availabilities
    .slice()
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .reduce((groups, slot) => {
      const key = localDateKey(new Date(slot.start));
      groups[key] ||= [];
      groups[key].push(slot);
      return groups;
    }, {});
  renderManageAvailabilityCalendar(slotsByDate);
  const selectedSlots = slotsByDate[manageAvailabilityDate] || [];
  $("#availabilityList").innerHTML = Object.keys(slotsByDate).length ? `
    <article class="availability-day">
      <div class="availability-date"><strong>${manageAvailabilityDate ? dateLabel(`${manageAvailabilityDate}T12:00:00`) : "日付を選択してください"}</strong><span>${selectedSlots.length}枠</span></div>
      <div class="availability-slots">
        ${selectedSlots.length ? selectedSlots.map((slot) => `<div class="availability-item"><div><strong>${timeLabel(slot.start)}</strong><span>${interviewerName(slot.interviewerId)}</span></div><button class="delete delete-availability" data-id="${slot.id}">削除</button></div>`).join("") : `<div class="empty">この日の登録枠はありません</div>`}
      </div>
    </article>
  ` : empty("登録済みの空きスケジュールはありません");
  $("#links").innerHTML = `<article class="row"><div class="row-icon violet">↗</div><div class="row-main"><strong>共通調整リンク</strong><span>全面接官の空き枠を匿名集約 ・ 候補者には「○枠」だけ表示</span><code class="link-code">${commonUrl()}</code></div><button class="copy copy-common-link">リンクをコピー</button></article>`;
  $("#bookings").innerHTML = state.bookings.length ? state.bookings.map((item) => {
    return `<article class="row booking-row"><div class="date-chip"><b>${new Date(item.start).getDate()}</b><span>${new Intl.DateTimeFormat("ja-JP",{month:"short"}).format(new Date(item.start))}</span></div><div class="row-main"><strong>${item.candidateName} ｜ 面接</strong><span>${fmt(item.start)} ・ 面接官: ${interviewerName(item.interviewerId)}</span><div class="booking-editor"><input type="datetime-local" class="booking-start" data-id="${item.id}" value="${datetimeLocalValue(item.start)}"><button class="copy save-booking" data-id="${item.id}">日時変更</button><button class="delete delete-booking" data-id="${item.id}">削除</button></div></div><span class="status ${item.calendarEventId ? "done" : ""}">${item.calendarEventId ? "カレンダー登録済み" : "未連携"}</span>${item.meetUrl ? `<a class="copy" href="${item.meetUrl}" target="_blank">Meetを開く</a>` : ""}</article>`;
  }).join("") : empty("設定された面接はまだありません");
  fillInterviewerSelects();
  bindRows();
  renderInterviewerPanel();
}
function bindRows() {
  document.querySelectorAll(".copy-common-link").forEach((button) => button.onclick = () => copyCommonLink(button));
  document.querySelectorAll(".delete-availability").forEach((button) => button.onclick = async () => { await api(`/api/availabilities/${button.dataset.id}`, { method: "DELETE" }); render(); });
  document.querySelectorAll(".add-for-person").forEach((button) => button.onclick = () => openAvailability(button.dataset.id));
  document.querySelectorAll(".delete-interviewer").forEach((button) => button.onclick = async () => { if (!confirm("この面接官と登録済み空き枠を削除しますか？")) return; await api(`/api/interviewers/${button.dataset.id}`, { method: "DELETE" }); render(); });
  document.querySelectorAll(".save-email").forEach((button) => button.onclick = async () => {
    const email = document.querySelector(`.interviewer-email[data-id="${button.dataset.id}"]`);
    const meetUrl = document.querySelector(`.interviewer-meet[data-id="${button.dataset.id}"]`);
    await api(`/api/interviewers/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ email: email.value, meetUrl: meetUrl.value }) });
    button.textContent = "保存済み";
    setTimeout(render, 700);
  });
  document.querySelectorAll(".priority-up").forEach((button) => button.onclick = async () => { await api(`/api/interviewers/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ priority: Number(button.dataset.priority) - 1.5 }) }); render(); });
  document.querySelectorAll(".priority-down").forEach((button) => button.onclick = async () => { await api(`/api/interviewers/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ priority: Number(button.dataset.priority) + 1.5 }) }); render(); });
  document.querySelectorAll(".delete-booking").forEach((button) => button.onclick = async () => { if (!confirm("この面接予定を削除しますか？")) return; await api(`/api/bookings/${button.dataset.id}`, { method: "DELETE" }); render(); });
  document.querySelectorAll(".save-booking").forEach((button) => button.onclick = async () => {
    const input = document.querySelector(`.booking-start[data-id="${button.dataset.id}"]`);
    const result = await api(`/api/bookings/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ start: new Date(input.value).toISOString() }) });
    if (result.calendarError) alert(`カレンダー更新エラー: ${result.calendarError}`);
    render();
  });
}
document.querySelectorAll("[data-open]").forEach((button) => button.onclick = () => button.dataset.open === "availabilityModal" ? openAvailability() : $(`#${button.dataset.open}`).showModal());
document.querySelectorAll("[data-close]").forEach((button) => button.onclick = () => {
  if (button.dataset.close === "availabilityModal") {
    pendingAvailability = [];
    renderAvailabilityPreview();
  }
  $(`#${button.dataset.close}`).close();
});
$("#toggleInterviewers").onclick = () => { interviewerPanelOpen = !interviewerPanelOpen; renderInterviewerPanel(); };
$("#interviewerForm").onsubmit = async (event) => { event.preventDefault(); const data = new FormData(event.target); await api("/api/interviewers", { method: "POST", body: JSON.stringify({ name: data.get("name"), email: data.get("email"), meetUrl: data.get("meetUrl") }) }); event.target.reset(); $("#interviewerModal").close(); render(); };
$("#addDaySlots").onclick = () => {
  if (!availabilityDate) return;
  for (let hour = 10; hour <= 20; hour++) {
    const iso = new Date(`${availabilityDate}T${String(hour).padStart(2, "0")}:00:00`).toISOString();
    if (!pendingAvailability.includes(iso)) pendingAvailability.push(iso);
  }
  renderAvailabilityPreview(); renderAvailabilityCalendar();
};
$("#clearAvailability").onclick = () => { pendingAvailability = []; renderAvailabilityPreview(); renderAvailabilityCalendar(); };
$("#availabilityForm").onsubmit = async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  if (!pendingAvailability.length) { event.target.reset(); $("#availabilityModal").close(); return; }
  await api("/api/availabilities", { method: "POST", body: JSON.stringify({ interviewerId: data.get("interviewerId"), starts: pendingAvailability }) });
  event.target.reset(); $("#availabilityModal").close(); render();
};
$("#settingsForm").onsubmit = async (event) => { event.preventDefault(); await api("/api/settings", { method: "POST", body: JSON.stringify({ teamName: $("#teamName").value, calendarEmail: $("#calendarEmail").value, notificationEmail: $("#notificationEmail").value }) }); $("#notice").innerHTML = `<div class="notice">設定を保存しました</div>`; };
const googleStatus = new URLSearchParams(location.search).get("google");
if (googleStatus === "missing") $("#notice").innerHTML = `<div class="notice warn">Google連携にはOAuth設定が必要です。READMEをご確認ください。</div>`;
if (googleStatus === "connected") $("#notice").innerHTML = `<div class="notice">Googleカレンダーと連携しました。連携時は frt.shibuya@gmail.com でログインしてください。</div>`;
render();
