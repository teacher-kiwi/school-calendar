const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");

// Configure Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const calendar = google.calendar({ version: "v3", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "events";

// Helper to get all data
async function getAllRows() {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:M`, // Assuming config row 1 is header
  });
  return result.data.values || [];
}

const SheetsService = {
  /**
   * Get all events
   */
  async getEvents() {
    try {
      const rows = await getAllRows();
      const events = [];

      // Add Holidays (Simple implementation using Google Calendar API)
      // Note: This requires the Service Account to have access to public calendars or API usage
      try {
        const year = new Date().getFullYear();
        const holidayRes = await calendar.events.list({
          calendarId: "ko.south_korea#holiday@group.v.calendar.google.com",
          timeMin: `${year}-01-01T00:00:00Z`,
          timeMax: `${year}-12-31T23:59:59Z`,
          singleEvents: true,
        });

        if (holidayRes.data.items) {
          const holidays = holidayRes.data.items.map((event) => ({
            id: "holiday-" + event.start.date,
            title: event.summary,
            start: event.start.date,
            allDay: true,
            backgroundColor: "#ef4444",
            borderColor: "#dc2626",
            extendedProps: {
              category: "공휴일",
              isHoliday: true,
            },
          }));
          events.push(...holidays);
        }
      } catch (e) {
        console.warn(
          "Failed to fetch holidays, proceeding without them:",
          e.message,
        );
      }

      // Add Sheet Events
      rows.forEach((row) => {
        if (!row[0]) return; // Skip if no ID

        const category = row[6];
        let backgroundColor = "#6b7280";
        let borderColor = "#4b5563";

        if (category === "행사") {
          backgroundColor = "#3b82f6";
          borderColor = "#2563eb";
        } else if (category === "예약") {
          backgroundColor = "#10b981";
          borderColor = "#059669";
        }

        const creatorName = row[7];
        const createdByEmail = row[8];
        const createdAt = row[9];
        const modifierName = row[10];
        const modifiedByEmail = row[11];
        const modifiedAt = row[12];

        events.push({
          id: row[0],
          title: row[1],
          start: row[2],
          time: row[3],
          location: row[4],
          description: row[5],
          category: category,
          createdBy: createdByEmail,
          createdAt: createdAt,
          modifiedBy: modifiedByEmail,
          modifiedAt: modifiedAt || null,
          allDay: true,
          backgroundColor,
          borderColor,
          extendedProps: {
            time: row[3],
            location: row[4],
            description: row[5],
            category: category,
            createdBy: createdByEmail,
            creatorName: creatorName || createdByEmail, // Fallback
            createdAt: createdAt,
            modifiedBy: modifiedByEmail || null,
            modifierName: modifierName || modifiedByEmail, // Fallback
            modifiedAt: modifiedAt || null,
          },
        });
      });

      return events;
    } catch (error) {
      console.error("Error in getEvents:", error);
      throw error;
    }
  },

  /**
   * Add new event
   */
  async addEvent(eventData, user) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const userEmail = user.email;
    const userName = user.displayName || user.email;

    const row = [
      id,
      eventData.title,
      eventData.date,
      eventData.time || "",
      eventData.location || "",
      eventData.description || "",
      eventData.category,
      userName, // col H (7): creatorName
      userEmail, // col I (8): createdBy
      now, // col J (9): createdAt
      "", // col K (10): modifierName
      "", // col L (11): modifiedBy
      "", // col M (12): modifiedAt
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [row],
      },
    });

    return { message: "일정이 추가되었습니다.", id };
  },

  /**
   * Add multiple events at once (batch insert)
   */
  async addEvents(eventsArray, user) {
    const now = new Date().toISOString();
    const userEmail = user.email;
    const userName = user.displayName || user.email;

    const rows = eventsArray.map((eventData) => [
      uuidv4(),
      eventData.title,
      eventData.date,
      eventData.time || "",
      eventData.location || "",
      eventData.description || "",
      eventData.category,
      userName,
      userEmail,
      now,
      "",
      "",
      "",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: rows,
      },
    });

    return { message: `${rows.length}개의 일정이 추가되었습니다.`, count: rows.length };
  },

  /**
   * Update event
   */
  async updateEvent(id, eventData, user) {
    const allRows = await getAllRows();
    const rowIndex = allRows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) {
      throw new Error("이벤트를 찾을 수 없습니다.");
    }

    const realRowIndex = rowIndex + 2;
    const currentRow = allRows[rowIndex];

    const userEmail = user.email;
    const userName = user.displayName || user.email;

    const updatedRow = [...currentRow];
    // Ensure row has enough length
    while (updatedRow.length < 13) updatedRow.push("");

    updatedRow[1] = eventData.title;
    updatedRow[2] = eventData.date;
    updatedRow[3] = eventData.time || "";
    updatedRow[4] = eventData.location || "";
    updatedRow[5] = eventData.description || "";
    updatedRow[6] = eventData.category;

    // Modification info
    const now = new Date().toISOString();
    updatedRow[10] = userName; // modifierName
    updatedRow[11] = userEmail; // modifiedBy
    updatedRow[12] = now; // modifiedAt

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${realRowIndex}:M${realRowIndex}`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [updatedRow],
      },
    });

    return { message: "일정이 수정되었습니다." };
  },

  /**
   * Delete event
   */
  async deleteEvent(id) {
    const allRows = await getAllRows();
    const rowIndex = allRows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) {
      throw new Error("이벤트를 찾을 수 없습니다.");
    }

    const realRowIndex = rowIndex + 2;

    if (!this.sheetId) {
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const sheet = metadata.data.sheets.find(
        (s) => s.properties.title === SHEET_NAME,
      );
      if (!sheet) throw new Error("Sheet not found");
      this.sheetId = sheet.properties.sheetId;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: this.sheetId,
                dimension: "ROWS",
                startIndex: realRowIndex - 1,
                endIndex: realRowIndex,
              },
            },
          },
        ],
      },
    });

    return { message: "일정이 삭제되었습니다." };
  },
};

module.exports = SheetsService;
