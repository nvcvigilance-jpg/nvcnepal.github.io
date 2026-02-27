/**
 * Google Apps Script for National Vigilance Center (NVC) Complaint Management System
 * Backend logic to handle data storage for Complaints, Projects, Employee Monitoring,
 * Citizen Charter, and Notifications.
 *
 * VERSION: 2.3.0 (Added Location Support & Parameter Mapping)
 */

// ==================== CONFIGURATION ====================
const SPREADSHEET_ID = '1VDsN3UOlDwjYPC3AOJvKpUu20d4I6cc_JLZYD8ogsGU';
const CONFIG = {
  SHEETS: {
    COMPLAINTS: 'Complaints',
    PROJECTS: 'Projects',
    EMPLOYEE_MONITORING: 'EmployeeMonitoring',
    CITIZEN_CHARTER: 'CitizenCharter',
    NOTIFICATIONS: 'Notifications',
    USERS: 'Users',
    CONFIG: 'Config'
  },
  API_KEY: 'nvc2026secretkey',
  VERSION: '2.3.0'
};

// ==================== PARAMETER MAPPING ====================
// Maps frontend JSON keys (English) to Sheet Headers (Nepali/English)
const PARAM_MAP = {
  'date': 'दर्ता मिति',
  'dateNepali': 'दर्ता मिति नेपाली',
  'complainant': 'उजुरीकर्ताको नाम',
  'accused': 'विपक्षी',
  'description': 'उजुरीको संक्षिप्त विवरण',
  'committeeDecision': 'समितिको निर्णय',
  'decision': 'अन्तिम निर्णय',
  'finalDecision': 'अन्तिम निर्णयको प्रकार',
  'remarks': 'कैफियत',
  'status': 'स्थिति',
  'shakha': 'सम्बन्धित शाखा',
  'mahashakha': 'महाशाखा',
  'source': 'उजुरीको माध्यम',
  'assignedShakha': 'शाखामा पठाएको',
  'assignedDate': 'शाखामा पठाएको मिति',
  'createdBy': 'सिर्जना गर्ने',
  'createdAt': 'सिर्जना मिति',
  'updatedBy': 'अपडेट गर्ने',
  'updatedAt': 'अपडेट मिति',
  'instructions': 'निर्देशन',
  'investigationDetails': 'छानबिनको विवरण',
  'correspondenceDate': 'पत्राचार मिति',
  'province': 'प्रदेश',
  'district': 'जिल्ला',
  'location': 'स्थानीय तह',
  'ward': 'वडा'
};

// ==================== HELPERS ====================
function log() { try { Logger.log.apply(Logger, arguments); } catch (e) {} }

function getSpreadsheet() {
  try {
    if (SPREADSHEET_ID && typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID.length > 10) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    log('openById failed, falling back to active spreadsheet:', e.toString());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet && headers && headers.length) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function validateApiKey(params) {
  const provided = (params && (params.apiKey || params.API_KEY)) || '';
  return String(provided) === String(CONFIG.API_KEY);
}

function normalizeKey(k) {
  if (k === undefined || k === null) return '';
  return String(k).trim().toLowerCase();
}

function generateComplaintId() {
  const now = new Date();
  const yy = now.getFullYear();
  const stamp = now.getTime().toString().slice(-6);
  return `NVC-${yy}-${stamp}`;
}

function generateProjectId() {
  const now = new Date();
  const yy = now.getFullYear();
  const stamp = now.getTime().toString().slice(-6);
  return `P-${yy}-${stamp}`;
}

// Read sheet data as array of objects using header row
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c+1}`;
      obj[key] = row[c] !== undefined ? row[c] : '';
    }
    // convenience id
    if (!obj.id) {
      if (obj['उजुरी दर्ता नं']) obj.id = obj['उजुरी दर्ता नं'];
      else if (obj['project_id']) obj.id = obj['project_id'];
    }
    rows.push(obj);
  }
  return rows;
}

// Find row index (1-based) by id value using a header name (case-insensitive)
function findRowIndexById(sheet, idValue, idHeaderCandidates) {
  if (!sheet || !idValue) return -1;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return -1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  // Build header map lower->index
  const map = {};
  for (let i = 0; i < headers.length; i++) map[normalizeKey(headers[i])] = i + 1;

  // Determine which column to search
  let colIndex = -1;
  if (Array.isArray(idHeaderCandidates)) {
    for (const cand of idHeaderCandidates) {
      const k = normalizeKey(cand);
      if (map[k]) { colIndex = map[k]; break; }
    }
  }
  // fallback to first column if not found
  if (colIndex === -1) colIndex = 1;

  const values = sheet.getRange(2, colIndex, Math.max(0, lastRow - 1), 1).getValues();
  const search = String(idValue).trim().toLowerCase();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === search) return i + 2;
  }
  return -1;
}

/**
 * Save or update a row in a sheet.
 * - Detects ID using multiple keys
 * - If existing row found: merges provided fields with existing values (PATCH-style)
 * - If not found: appends a new row, generating ID and timestamps when appropriate
 */
function saveToSheet(sheetName, data, idColumn = 'उजुरी दर्ता नं') {
  const sheet = getSheet(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return { success: false, message: 'Sheet has no headers' };
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Normalize incoming data keys to their raw string forms when possible
  // AND apply PARAM_MAP to support English keys mapping to Nepali headers
  const incoming = {};
  for (const k in data) {
    incoming[k] = data[k];
    if (PARAM_MAP[k]) {
      incoming[PARAM_MAP[k]] = data[k];
    }
  }

  // Determine ID value from several possible keys
  const possibleIdKeys = [idColumn, 'id', 'complaintId', 'Complaint ID', 'उजुरी दर्ता नं'];
  let idValue = '';
  for (const key of possibleIdKeys) {
    if (incoming[key]) { idValue = String(incoming[key]); break; }
    // case-insensitive check
    const found = Object.keys(incoming).find(kk => normalizeKey(kk) === normalizeKey(key));
    if (found) { idValue = String(incoming[found]); break; }
  }

  // If id not provided for append, generate one for complaint sheet
  const isComplaintSheet = normalizeKey(sheetName) === normalizeKey(CONFIG.SHEETS.COMPLAINTS);
  const isProjectSheet = normalizeKey(sheetName) === normalizeKey(CONFIG.SHEETS.PROJECTS);
  if (!idValue && isComplaintSheet) {
    idValue = generateComplaintId();
    incoming[idColumn] = idValue;
    incoming.id = idValue;
  }

  // For projects, generate a project_id if not provided so rows have stable IDs
  if (!idValue && isProjectSheet) {
    idValue = generateProjectId();
    incoming[idColumn] = idValue;
    incoming.id = idValue;
  }

  // Find existing row if any (search multiple header names)
  const idHeaderCandidates = [idColumn, 'id', 'उजुरी दर्ता नं', 'Complaint ID', 'project_id', 'monitoring_id'];
  const existingRow = findRowIndexById(sheet, idValue, idHeaderCandidates);

  if (existingRow > 0) {
    // PATCH: read existing row, merge, and write back
    const existingValues = sheet.getRange(existingRow, 1, 1, lastCol).getValues()[0];
    const headerMap = {};
    for (let i = 0; i < headers.length; i++) headerMap[normalizeKey(headers[i])] = i;

    const merged = existingValues.slice();
    // Overwrite only columns that are present in incoming (non-empty string or non-null)
    for (const rawKey in incoming) {
      const nk = normalizeKey(rawKey);
      if (headerMap.hasOwnProperty(nk)) {
        const col = headerMap[nk];
        const v = incoming[rawKey];
        if (v !== undefined && v !== null && String(v) !== '') merged[col] = v;
      }
    }

    // auto set update date/updated_by if those headers exist
    if (headerMap.hasOwnProperty(normalizeKey('अपडेट मिति'))) merged[headerMap[normalizeKey('अपडेट मिति')]] = new Date().toISOString();
    if (headerMap.hasOwnProperty(normalizeKey('अपडेट गर्ने')) && incoming['अपडेट गर्ने']) merged[headerMap[normalizeKey('अपडेट गर्ने')]] = incoming['अपडेट गर्ने'];

    sheet.getRange(existingRow, 1, 1, merged.length).setValues([merged]);
    return { success: true, message: 'Record updated', id: idValue, action: 'update' };
  }

  // Append new row
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    // Find matching key in incoming data (case-insensitive)
    const incomingKey = Object.keys(incoming).find(k => normalizeKey(k) === normalizeKey(h));
    
    if (incomingKey) {
      row.push(incoming[incomingKey]);
    } else {
      // auto-set basic created/entry dates if appropriate
      if (normalizeKey(h) === normalizeKey('सिर्जना मिति') || normalizeKey(h) === normalizeKey('सिर्जना') || normalizeKey(h) === normalizeKey('सिर्जना_at') || normalizeKey(h) === normalizeKey('created_at') ) {
        row.push(incoming[h] || new Date().toISOString());
      } else if (normalizeKey(h) === normalizeKey('सिर्जना गर्ने') || normalizeKey(h) === normalizeKey('created_by')) {
        row.push(incoming['createdBy'] || incoming['सिर्जना गर्ने'] || '');
      } else if (normalizeKey(h) === normalizeKey('उजुरी दर्ता नं') && !incoming[h]) {
        row.push(idValue || '');
      } else {
        row.push(incoming[h] !== undefined && incoming[h] !== null ? incoming[h] : '');
      }
    }
  }

  sheet.appendRow(row);
  return { success: true, message: 'Record created', id: idValue || null, action: 'create' };
}

function deleteFromSheet(sheetName, id, idColumn = 'उजुरी दर्ता नं') {
  const sheet = getSheet(sheetName);
  if (!sheet) return { success: false, message: 'Sheet not found' };
  const idx = findRowIndexById(sheet, id, [idColumn, 'id', 'उजुरी दर्ता नं', 'project_id', 'monitoring_id']);
  if (idx > 0) { sheet.deleteRow(idx); return { success: true, message: 'Record deleted' }; }
  return { success: false, message: 'Record not found' };
}

function createResponse(data, callback) {
  const out = ContentService.createTextOutput();
  if (callback) {
    out.setContent(`${callback}(${JSON.stringify(data)})`);
    out.setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    out.setContent(JSON.stringify(data));
    out.setMimeType(ContentService.MimeType.JSON);
  }
  return out;
}

// ==================== API HANDLER ====================
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = params.callback;
  const action = params.action || '';

  if (action !== 'test' && !validateApiKey(params)) {
    return createResponse({ success: false, message: 'Invalid API Key', action }, callback);
  }

  try {
    let response = { success: false, message: 'Unknown action' };
    switch (action) {
      case 'test':
        response = { success: true, message: 'API Working', version: CONFIG.VERSION, sheets: CONFIG.SHEETS };
        break;

      case 'getComplaints':
        response = { success: true, data: getSheetData(CONFIG.SHEETS.COMPLAINTS), count: getSheetData(CONFIG.SHEETS.COMPLAINTS).length };
        break;

      case 'saveComplaint':
      case 'updateComplaint':
      case 'saveHelloSarkarComplaint':
        // ensure ID keys are present if provided as id
        if (!params['उजुरी दर्ता नं'] && params.id) params['उजुरी दर्ता नं'] = params.id;
        response = saveToSheet(CONFIG.SHEETS.COMPLAINTS, params, 'उजुरी दर्ता नं');
        break;

      case 'deleteComplaint':
        response = deleteFromSheet(CONFIG.SHEETS.COMPLAINTS, params.id || params['उजुरी दर्ता नं'], 'उजुरी दर्ता नं');
        break;

      case 'getProjects':
        response = { success: true, data: getSheetData(CONFIG.SHEETS.PROJECTS) };
        break;
      case 'saveProject':
      case 'updateProject':
        response = saveToSheet(CONFIG.SHEETS.PROJECTS, params, 'project_id');
        break;
      case 'deleteProject':
        response = deleteFromSheet(CONFIG.SHEETS.PROJECTS, params.id, 'project_id');
        break;

      case 'getEmployeeMonitoring':
        response = { success: true, data: getSheetData(CONFIG.SHEETS.EMPLOYEE_MONITORING) };
        break;
      case 'saveEmployeeMonitoring':
        response = saveToSheet(CONFIG.SHEETS.EMPLOYEE_MONITORING, params, 'monitoring_id');
        break;
      case 'deleteEmployeeMonitoring':
        response = deleteFromSheet(CONFIG.SHEETS.EMPLOYEE_MONITORING, params.id, 'monitoring_id');
        break;

      case 'getCitizenCharter':
        response = { success: true, data: getSheetData(CONFIG.SHEETS.CITIZEN_CHARTER) };
        break;
      case 'saveCitizenCharter':
        response = saveToSheet(CONFIG.SHEETS.CITIZEN_CHARTER, params, 'charter_id');
        break;

      case 'getNotifications':
        response = { success: true, data: getSheetData(CONFIG.SHEETS.NOTIFICATIONS) };
        break;
      case 'sendNotification':
        response = saveToSheet(CONFIG.SHEETS.NOTIFICATIONS, params, 'notification_id');
        break;
      case 'deleteNotification':
        response = deleteFromSheet(CONFIG.SHEETS.NOTIFICATIONS, params.id, 'notification_id');
        break;

      case 'getUsers':
        // Return users without passwords
        const users = getSheetData(CONFIG.SHEETS.USERS).map(u => {
          const copy = {};
          Object.keys(u).forEach(k => { if (normalizeKey(k) !== 'password') copy[k] = u[k]; });
          return copy;
        });
        response = { success: true, data: users, count: users.length };
        break;
      case 'saveUser':
        response = saveToSheet(CONFIG.SHEETS.USERS, params, 'username');
        break;
      case 'authenticateUser':
        const allUsers = getSheetData(CONFIG.SHEETS.USERS);
        const user = allUsers.find(u => String(u.username) === String(params.username) && String(u.password) === String(params.password));
        if (user) { const { password, ...rest } = user; response = { success: true, user: rest }; }
        else response = { success: false, message: 'Invalid username or password' };
        break;

      case 'generateReport':
        const reportType = params.reportType || 'summary';
        const allComplaints = getSheetData(CONFIG.SHEETS.COMPLAINTS);
        let reportData = [];
        switch (reportType) {
          case 'monthly':
            const now = new Date();
            reportData = allComplaints.filter(c => {
              const d = new Date(c['सिर्जना मिति'] || c['created_at'] || c['सिर्जना'] || c.entryDate || c.createdAt || new Date());
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            break;
          case 'shakha':
            reportData = allComplaints.filter(c => (c['सम्बन्धित शाखा'] || c.shakha) === params.shakha);
            break;
          default:
            reportData = allComplaints;
        }
        const stats = {
          total: reportData.length,
          pending: reportData.filter(c => (String(c['स्थिति'] || c.status || '').toLowerCase() === 'pending')).length,
          progress: reportData.filter(c => (String(c['स्थिति'] || c.status || '').toLowerCase() === 'progress')).length,
          resolved: reportData.filter(c => (String(c['स्थिति'] || c.status || '').toLowerCase() === 'resolved')).length
        };
        stats.resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
        response = { success: true, data: reportData, statistics: stats, generatedAt: new Date().toISOString() };
        break;

      default:
        response = { success: false, message: `Unknown action: ${action}` };
    }
    return createResponse(response, callback);
  } catch (err) {
    log('Error in doGet:', err.toString());
    return createResponse({ success: false, message: err.toString(), stack: err.stack }, params.callback);
  }
}

function doPost(e) { return doGet(e); }

// ==================== SETUP ====================
function setupSheets() {
  const ss = getSpreadsheet();
  const sheetsConfig = [
    { name: CONFIG.SHEETS.COMPLAINTS, headers: [
      'उजुरी दर्ता नं','दर्ता मिति','दर्ता मिति नेपाली','उजुरीकर्ताको नाम','विपक्षी',
      'उजुरीको संक्षिप्त विवरण','समितिको निर्णय','अन्तिम निर्णय','अन्तिम निर्णयको प्रकार','कैफियत',
      'स्थिति','सम्बन्धित शाखा','महाशाखा','उजुरीको माध्यम','शाखामा पठाएको','शाखामा पठाएको मिति',
      'सिर्जना गर्ने','सिर्जना मिति','अपडेट गर्ने','अपडेट मिति','निर्देशन','छानबिनको विवरण','पत्राचार मिति',
      'प्रदेश','जिल्ला','स्थानीय तह','वडा'
    ]},
    { name: CONFIG.SHEETS.PROJECTS, headers: ['project_id','project_name','organization','inspection_date','non_compliances','improvement_letter_date','improvement_info','status','remarks','shakha','created_by','created_at'] },
    { name: CONFIG.SHEETS.EMPLOYEE_MONITORING, headers: ['monitoring_id','monitoring_date','organization','uniform_violation','time_violation','instruction_date','remarks','created_by','created_at'] },
    { name: CONFIG.SHEETS.CITIZEN_CHARTER, headers: ['charter_id','monitoring_date','organization','findings','instructions','instruction_date','remarks','created_by','created_at'] },
    { name: CONFIG.SHEETS.NOTIFICATIONS, headers: ['notification_id','title','message','time','target_shakha','type','sender','read','created_at'] },
    { name: CONFIG.SHEETS.USERS, headers: ['username','password','name','role','shakha','mahashakha','status','last_login','created_at'] },
    { name: CONFIG.SHEETS.CONFIG, headers: ['config_key','config_value','description'] }
  ];

  sheetsConfig.forEach(cfg => {
    let sh = ss.getSheetByName(cfg.name);
    if (!sh) {
      sh = ss.insertSheet(cfg.name);
      if (cfg.headers && cfg.headers.length) {
        sh.getRange(1,1,1,cfg.headers.length).setValues([cfg.headers]);
        sh.getRange(1,1,1,cfg.headers.length).setFontWeight('bold');
        sh.setFrozenRows(1);
      }
      log('Created sheet:', cfg.name);
    } else {
      log('Sheet exists:', cfg.name);
    }
  });

  // Add default admin user if users sheet empty
  const usersSheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (usersSheet && usersSheet.getLastRow() === 1) {
    usersSheet.appendRow(['admin','nvc123','एडमिन','admin','','','active','', new Date().toISOString()]);
    log('Inserted default admin user');
  }

  const configSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (configSheet && configSheet.getLastRow() === 1) {
    configSheet.appendRow(['api_key', CONFIG.API_KEY, 'API Key for authentication']);
    configSheet.appendRow(['version', CONFIG.VERSION, 'System version']);
    configSheet.appendRow(['setup_date', new Date().toISOString(), 'Initial setup date']);
    log('Inserted config entries');
  }

  return 'Setup complete';
}

/* End of file */
