// ============================================
// 전역 변수
// ============================================

let calendar;
// currentUser is injected via EJS in index.ejs
let currentEvent = null;
let allEvents = [];
let selectedDateStr = "";
let selectedDayCell = null;

// ============================================
// 초기화
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  initCalendar();
  loadEvents();
});

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * FullCalendar 초기화
 */
function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "todayButton",
    },
    customButtons: {
      todayButton: {
        text: "오늘",
        click: function () {
          calendar.today();
          selectDate(getTodayStr());
        },
      },
    },
    dayMaxEvents: 2,
    moreLinkText: function (num) {
      return "+" + num;
    },
    dayCellContent: function (arg) {
      return arg.dayNumberText.replace("일", "");
    },
    fixedWeekCount: false,
    height: "100%",

    // 날짜 클릭 - 오른쪽 패널에 일정 표시
    dateClick: function (info) {
      selectDate(info.dateStr);
    },

    // 이벤트 클릭 - 해당 날짜 선택 후 카드 하이라이트
    eventClick: function (info) {
      selectDate(info.event.startStr);
      setTimeout(() => {
        const card = document.querySelector(
          `[data-event-id="${info.event.id}"]`,
        );
        if (card) {
          card.classList.add("ring-2", "ring-blue-500");
          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
          setTimeout(
            () => card.classList.remove("ring-2", "ring-blue-500"),
            2000,
          );
        }
      }, 100);
    },

    // 기본 이벤트 표시 숨기기
    eventDisplay: "none",

    // 날짜 셀 렌더링 후 커스텀 콘텐츠 추가
    dayCellDidMount: function (arg) {
      updateDayCellContent(arg.el, arg.date);
    },

    // 월 변경 시 커스텀 콘텐츠 재렌더링
    datesSet: function () {
      refreshAllDayCells();
    },
  });

  calendar.render();

  // 오늘 날짜 선택
  selectedDateStr = getTodayStr();
  updateDateHeader(selectedDateStr);
}

/**
 * 이벤트 로드
 */
async function loadEvents() {
  document.getElementById("calendar").classList.add("loading");

  try {
    const response = await fetch("/api/events");
    const events = await response.json();

    if (!Array.isArray(events)) {
      console.warn("이벤트 데이터 형식이 올바르지 않습니다:", events);
      throw new Error("Invalid format");
    }

    allEvents = events;
    calendar.removeAllEvents();
    events.forEach(function (event) {
      calendar.addEvent(event);
    });
    document.getElementById("calendar").classList.remove("loading");

    // 날짜 셀 커스텀 콘텐츠 업데이트
    refreshAllDayCells();

    // 현재 선택된 날짜 유지 (없으면 오늘)
    selectDate(selectedDateStr || getTodayStr());
  } catch (error) {
    console.error("이벤트 로드 실패:", error);
    document.getElementById("calendar").classList.remove("loading");
    Swal.fire({
      icon: "error",
      title: "로드 실패",
      text: "일정을 불러오는데 실패했습니다.",
      confirmButtonColor: "#3b82f6",
    });
  }
}

/**
 * 날짜 셀에 커스텀 콘텐츠 표시
 */
function updateDayCellContent(cellEl, date) {
  // 로컬 타임존 기준 날짜 문자열 생성
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const dayEvents = allEvents.filter((e) => e.start === dateStr);

  // 공휴일 여부 확인 및 클래스 토글
  const isHoliday = dayEvents.some(
    (e) => e.extendedProps?.isHoliday || e.extendedProps?.category === "공휴일",
  );
  if (isHoliday) {
    cellEl.classList.add("fc-day-holiday");
  } else {
    cellEl.classList.remove("fc-day-holiday");
  }

  // 콘텐츠 영역 찾고 먼저 비우기
  const contentEl = cellEl.querySelector(".fc-daygrid-day-events");
  if (!contentEl) return;
  contentEl.innerHTML = "";

  if (dayEvents.length === 0) return;

  // 카테고리별 분류
  const holidays = dayEvents.filter(
    (e) => e.extendedProps?.isHoliday || e.extendedProps?.category === "공휴일",
  );
  const events = dayEvents.filter((e) => e.extendedProps?.category === "행사");
  const reservations = dayEvents.filter(
    (e) => e.extendedProps?.category === "예약",
  );

  // 공휴일 표시
  holidays.forEach((h) => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-1 text-xs px-3 py-0.5";
    div.innerHTML = `<span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span><span class="truncate text-red-600 font-medium">${h.title}</span>`;
    contentEl.appendChild(div);
  });

  // 행사 카운트
  if (events.length > 0) {
    const div = document.createElement("div");
    div.className = "flex items-center gap-1 text-xs px-3 py-0.5";
    div.innerHTML = `<span class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span><span class="text-gray-700">${events.length}개</span>`;
    contentEl.appendChild(div);
  }

  // 예약 카운트
  if (reservations.length > 0) {
    const div = document.createElement("div");
    div.className = "flex items-center gap-1 text-xs px-3 py-0.5";
    div.innerHTML = `<span class="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span><span class="text-gray-700">${reservations.length}개</span>`;
    contentEl.appendChild(div);
  }
}

/**
 * 모든 날짜 셀 업데이트 (이벤트 로드 후 호출)
 */
function refreshAllDayCells() {
  const cells = document.querySelectorAll(".fc-daygrid-day");
  cells.forEach((cell) => {
    const dateStr = cell.dataset.date;
    if (dateStr) {
      updateDayCellContent(cell, new Date(dateStr));
    }
  });
}

// ============================================
// 날짜 선택 및 일일 일정 표시
// ============================================

function selectDate(dateStr) {
  selectedDateStr = dateStr;

  // 이전 선택 제거
  if (selectedDayCell) {
    selectedDayCell.classList.remove("fc-day-selected");
  }

  // 새 선택 표시
  const cells = document.querySelectorAll(".fc-daygrid-day");
  cells.forEach((cell) => {
    if (cell.dataset.date === dateStr) {
      cell.classList.add("fc-day-selected");
      selectedDayCell = cell;
    }
  });

  updateDateHeader(dateStr);
  updateDaySchedule(dateStr);
}

function updateDateHeader(dateStr) {
  const date = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const titleEl = document.getElementById("selectedDateTitle");

  titleEl.textContent = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function updateDaySchedule(dateStr) {
  const scheduleEl = document.getElementById("daySchedule");
  const emptyEl = document.getElementById("emptyState");

  // 해당 날짜의 일정 필터링
  const dayEvents = allEvents.filter((e) => e.start === dateStr);

  if (dayEvents.length === 0) {
    scheduleEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    return;
  }

  scheduleEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  // 일정 카드 생성
  scheduleEl.innerHTML = dayEvents
    .map((event) => {
      const props = event.extendedProps;
      const isHoliday = props.isHoliday || props.category === "공휴일";
      const isEvent = props.category === "행사";

      let bgColor, dotColor;
      if (isHoliday) {
        bgColor = "bg-red-50 border-red-200";
        dotColor = "bg-red-500";
      } else if (isEvent) {
        bgColor = "bg-blue-50 border-blue-200";
        dotColor = "bg-blue-500";
      } else {
        bgColor = "bg-emerald-50 border-emerald-200";
        dotColor = "bg-emerald-500";
      }

      // 공휴일은 클릭 불필요
      const clickHandler = isHoliday
        ? ""
        : `onclick="showEventDetail('${event.id}')"`;
      const cursorStyle = isHoliday ? "" : "cursor-pointer";

      return `
    <div class="day-event-card ${bgColor} border rounded-xl p-4 ${cursorStyle}" 
         data-event-id="${event.id}"
         ${clickHandler}>
      <div class="flex items-start gap-3">
        <div class="w-2 h-2 ${dotColor} rounded-full mt-2 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-800 truncate">${event.title}</h3>
          ${
            !isHoliday
              ? `
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
            ${props.time ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>${props.time}</span>` : ""}
            ${props.location ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>${props.location}</span>` : ""}
          </div>
          ${props.description ? `<p class="mt-2 text-sm text-gray-500 line-clamp-2">${props.description}</p>` : ""}
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}

function showEventDetail(eventId) {
  const event = allEvents.find((e) => e.id === eventId);
  if (!event) return;

  const props = event.extendedProps;
  const canEdit =
    props.createdBy.toLowerCase() === currentUser.email.toLowerCase() ||
    currentUser.isAdmin;

  Swal.fire({
    title: event.title,
    html: `
    <div class="text-left space-y-3">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded text-xs font-medium ${props.category === "행사" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}">${props.category}</span>
        ${props.modifiedBy ? '<span class="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">수정됨</span>' : ""}
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p><strong>날짜:</strong> ${formatDateKorean(event.start)}</p>
        ${props.time ? `<p><strong>시간:</strong> ${props.time}</p>` : ""}
        ${props.location ? `<p><strong>장소:</strong> ${props.location}</p>` : ""}
        ${props.description ? `<p><strong>내용:</strong> ${props.description}</p>` : ""}
      </div>
      <div class="pt-3 border-t text-xs text-gray-400">
        작성: ${props.creatorName ? `${props.creatorName} (${props.createdBy})` : props.createdBy}
        ${props.modifiedBy ? `<br>수정: ${props.modifierName ? `${props.modifierName} (${props.modifiedBy})` : props.modifiedBy}` : ""}
      </div>
    </div>
  `,
    showCancelButton: canEdit,
    showDenyButton: canEdit,
    confirmButtonText: canEdit ? "수정" : "닫기",
    denyButtonText: "삭제",
    cancelButtonText: "닫기",
    confirmButtonColor: "#3b82f6",
    denyButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
  }).then((result) => {
    if (result.isConfirmed && canEdit) {
      openEditModal(event);
    } else if (result.isDenied && canEdit) {
      confirmDelete(eventId);
    }
  });
}

// ============================================
// 이벤트 모달
// ============================================

function onRepeatChange() {
  const repeatType = document.querySelector('input[name="repeatType"]:checked').value;
  const dateSeparator = document.getElementById("dateSeparator");
  const dateEnd = document.getElementById("dateEnd");
  const weekdayCheckboxes = document.getElementById("weekdayCheckboxes");

  if (repeatType === "none") {
    dateSeparator.classList.add("hidden");
    dateEnd.classList.add("hidden");
    dateEnd.required = false;
    weekdayCheckboxes.classList.add("hidden");
  } else if (repeatType === "daily") {
    dateSeparator.classList.remove("hidden");
    dateEnd.classList.remove("hidden");
    dateEnd.required = true;
    weekdayCheckboxes.classList.add("hidden");
  } else if (repeatType === "weekday") {
    dateSeparator.classList.remove("hidden");
    dateEnd.classList.remove("hidden");
    dateEnd.required = true;
    weekdayCheckboxes.classList.remove("hidden");
  }
}

function getDateRange(startStr, endStr) {
  const dates = [];
  const current = new Date(startStr);
  const end = new Date(endStr);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDateStr(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function openEventModal(dateStr) {
  currentEvent = null;
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
  document.getElementById("modalTitle").textContent = "새 일정 등록";
  document.getElementById("deleteBtn").classList.add("hidden");
  document.getElementById("eventMeta").classList.add("hidden");
  document.getElementById("submitBtn").textContent = "저장";

  // 반복 옵션 리셋
  document.getElementById("repeatOptions").classList.remove("hidden");
  document.querySelector('input[name="repeatType"][value="none"]').checked = true;
  document.getElementById("dateEnd").value = "";
  document.querySelectorAll('input[name="weekday"]').forEach(cb => cb.checked = false);
  onRepeatChange();

  // 기본값 설정
  const dateEl = document.getElementById("date");
  dateEl.value = dateStr || selectedDateStr || getTodayStr();
  // dateEl.readOnly = true;
  // dateEl.classList.add("bg-gray-100");

  // 기본 시간 설정 (현재 시간)
  const now = new Date();
  document.getElementById("startTime").value =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  document.getElementById("eventModal").classList.remove("hidden");
}

function openEditModal(event) {
  currentEvent = event;
  const props = event.extendedProps;

  document.getElementById("eventId").value = event.id;
  document.getElementById("modalTitle").textContent = "일정 수정";
  document.getElementById("title").value = event.title;

  // 수정 시 반복 옵션 숨김
  document.getElementById("repeatOptions").classList.add("hidden");
  document.querySelector('input[name="repeatType"][value="none"]').checked = true;
  document.getElementById("dateSeparator").classList.add("hidden");
  document.getElementById("dateEnd").classList.add("hidden");
  document.getElementById("dateEnd").required = false;
  document.getElementById("weekdayCheckboxes").classList.add("hidden");

  const dateEl = document.getElementById("date");
  dateEl.value = event.start; // startStr is for FullCalendar objects, start is for our raw data
  dateEl.readOnly = false;
  dateEl.classList.remove("bg-gray-100");

  const timeStr = props.time || "";
  if (timeStr.includes("~")) {
    const times = timeStr.split("~");
    document.getElementById("startTime").value = times[0];
    document.getElementById("endTime").value = times[1];
  } else {
    document.getElementById("startTime").value = timeStr;
    document.getElementById("endTime").value = "";
  }
  document.getElementById("location").value = props.location || "";
  document.getElementById("description").value = props.description || "";

  const category = props.category || "행사";
  const categoryInput = document.querySelector(
    `input[name="category"][value="${category}"]`,
  );
  if (categoryInput) categoryInput.checked = true;

  const metaEl = document.getElementById("eventMeta");
  const createdInfo = document.getElementById("createdByInfo");

  metaEl.classList.remove("hidden");
  const creatorDisplay = props.creatorName
    ? `${props.creatorName} (${props.createdBy})`
    : props.createdBy;
  createdInfo.textContent = `작성: ${creatorDisplay} (${formatDate(props.createdAt)})`;

  document.getElementById("deleteBtn").classList.remove("hidden");
  document.getElementById("submitBtn").textContent = "수정";
  document.getElementById("eventModal").classList.remove("hidden");
}

function closeEventModal() {
  document.getElementById("eventModal").classList.add("hidden");
  currentEvent = null;
}

async function saveEvent(e) {
  e.preventDefault();

  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  let timeStr = "";
  if (startTime && endTime) {
    timeStr = `${startTime}~${endTime}`;
  } else if (startTime) {
    timeStr = `${startTime}~`;
  } else if (endTime) {
    timeStr = `~${endTime}`;
  }

  const formData = {
    title: document.getElementById("title").value.trim(),
    date: document.getElementById("date").value,
    time: timeStr,
    location: document.getElementById("location").value.trim(),
    description: document.getElementById("description").value.trim(),
    category: document.querySelector('input[name="category"]:checked').value,
  };

  if (!formData.title || !formData.date) {
    Swal.fire({
      icon: "warning",
      title: "입력 오류",
      text: "제목과 날짜는 필수 입력 항목입니다.",
      confirmButtonColor: "#3b82f6",
    });
    return;
  }

  const eventId = document.getElementById("eventId").value;
  const isEdit = !!eventId;
  const repeatType = document.querySelector('input[name="repeatType"]:checked').value;

  // 반복 일정 유효성 검사
  if (!isEdit && repeatType !== "none") {
    const dateEnd = document.getElementById("dateEnd").value;
    if (!dateEnd) {
      Swal.fire({
        icon: "warning",
        title: "입력 오류",
        text: "끝 날짜를 선택해주세요.",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }
    if (dateEnd < formData.date) {
      Swal.fire({
        icon: "warning",
        title: "입력 오류",
        text: "끝 날짜가 시작 날짜보다 이전입니다.",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }
    if (repeatType === "weekday") {
      const checked = document.querySelectorAll('input[name="weekday"]:checked');
      if (checked.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "입력 오류",
          text: "반복할 요일을 선택해주세요.",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }
    }
  }

  Swal.fire({
    title: "저장 중...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    if (isEdit || repeatType === "none") {
      // 단일 저장 (기존 로직)
      const url = isEdit ? `/api/events/${eventId}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "저장 실패");

      Swal.fire({
        icon: "success",
        title: "저장 완료",
        text: result.message,
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // 반복 저장 (배치)
      const dateEnd = document.getElementById("dateEnd").value;
      let dates = getDateRange(formData.date, dateEnd);

      if (repeatType === "weekday") {
        const selectedDays = Array.from(
          document.querySelectorAll('input[name="weekday"]:checked')
        ).map(cb => parseInt(cb.value));
        dates = dates.filter(d => selectedDays.includes(d.getDay()));
      }

      if (dates.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "입력 오류",
          text: "선택한 조건에 해당하는 날짜가 없습니다.",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      const events = dates.map(d => ({
        ...formData,
        date: formatDateStr(d),
      }));

      const response = await fetch("/api/events/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "저장 실패");

      Swal.fire({
        icon: "success",
        title: "저장 완료",
        text: result.message,
        timer: 1500,
        showConfirmButton: false,
      });
    }

    closeEventModal();
    loadEvents();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "저장 실패",
      text: error.message || "알 수 없는 오류가 발생했습니다.",
      confirmButtonColor: "#3b82f6",
    });
  }
}

function deleteEvent() {
  const eventId = document.getElementById("eventId").value;
  if (!eventId) return;
  confirmDelete(eventId);
}

function confirmDelete(eventId) {
  Swal.fire({
    title: "일정 삭제",
    text: "이 일정을 삭제하시겠습니까?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "삭제",
    cancelButtonText: "취소",
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "삭제 중...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "DELETE",
        });

        const resResult = await response.json();

        if (!response.ok) {
          throw new Error(resResult.message || "삭제 실패");
        }

        Swal.fire({
          icon: "success",
          title: "삭제 완료",
          text: resResult.message,
          timer: 1500,
          showConfirmButton: false,
        });
        closeEventModal();
        loadEvents();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "삭제 실패",
          text: error.message || "알 수 없는 오류가 발생했습니다.",
          confirmButtonColor: "#3b82f6",
        });
      }
    }
  });
}

// ============================================
// 유틸리티
// ============================================

function formatDateKorean(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// ESC 키로 모달 닫기
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeEventModal();
});

// 전역 스코프에 함수 노출
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.saveEvent = saveEvent;
window.deleteEvent = deleteEvent;
window.confirmDelete = confirmDelete;
window.showEventDetail = showEventDetail;
