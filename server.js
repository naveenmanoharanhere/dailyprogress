import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";
import fs from "fs";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync("credentials.json")),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "PASTE_YOUR_SHEET_ID";
const SHEET_NAME = "Sheet1"; 

const colLetter = n => {
  let s = "";
  while (n > 0) {
    let m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
};

app.get("/structure", async (req, res) => {
  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME
  });

  const values = sheet.data.values;

  const columns = values[0].slice(1);          
  const rows = values.slice(1).map(r => r[0]); 

  res.json({ columns, rows });
});

app.post("/write", async (req, res) => {
  const { column, row, text } = req.body;

  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME
  });

  const values = sheet.data.values;

  const colIndex = values[0].indexOf(column);
  const rowIndex = values.findIndex(r => r[0] === row);

  if (colIndex === -1 || rowIndex === -1) {
    return res.status(400).send("Invalid row or column");
  }

  const cell = `${colLetter(colIndex + 1)}${rowIndex + 1}`;
  const existing = values[rowIndex][colIndex] || "";
  const updated = existing ? `${existing}\n${text}` : text;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!${cell}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[updated]] }
  });

  res.json({ success: true });
});

app.listen(3000, () => console.log("Backend running on port 3000"));
