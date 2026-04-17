const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';

function doGet() {
  return ContentService
    .createTextOutput('Membership form endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheets_(ss);

    const householdsSheet = ss.getSheetByName('Households');
    const parentsSheet = ss.getSheetByName('Parents');
    const childrenSheet = ss.getSheetByName('Children');
    const grandchildrenSheet = ss.getSheetByName('Grandchildren');

    const submissionId = Utilities.getUuid();
    const timestamp = new Date();

    const household = data.household || {};
    const normalizedFamilyName = normalizeText_(household.familyName);
    const normalizedPrimaryContact = normalizePhone_(household.primaryContact);
    const duplicateCount = countMatchingHouseholds_(householdsSheet, normalizedFamilyName, normalizedPrimaryContact);
    const duplicateFlag = duplicateCount > 0 ? 'Possible Duplicate' : 'New';

    appendHousehold_(householdsSheet, {
      submissionId: submissionId,
      timestamp: timestamp,
      mainContactName: household.mainContactName,
      familyName: household.familyName,
      primaryContact: household.primaryContact,
      secondaryContact: household.secondaryContact,
      email: household.email,
      address: household.address,
      submissionDate: household.submissionDate,
      normalizedFamilyName: normalizedFamilyName,
      normalizedPrimaryContact: normalizedPrimaryContact,
      duplicateFlag: duplicateFlag,
      duplicateCount: duplicateCount,
      submittedFrom: data.submittedFrom || ''
    });

    appendParent_(parentsSheet, submissionId, timestamp, 'Father', data.father || {});
    appendParent_(parentsSheet, submissionId, timestamp, 'Mother', data.mother || {});
    appendChildren_(childrenSheet, submissionId, timestamp, data.children || []);
    appendGrandchildren_(grandchildrenSheet, submissionId, timestamp, data.grandchildren || []);

    refreshAdminViews_(ss);

    return jsonResponse_({
      ok: true,
      submissionId: submissionId,
      duplicateFlag: duplicateFlag,
      duplicateCount: duplicateCount
    });
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: String(error)
    });
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureSheets_(ss);
  refreshAdminViews_(ss);
}

function refreshAdminViews() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  refreshAdminViews_(ss);
}

function ensureSheets_(ss) {
  ensureSheet_(ss, 'Households', [
    'Submission ID',
    'Timestamp',
    'Main Contact Name',
    'Family Name',
    'Primary Contact Number',
    'Secondary Contact Number',
    'Email Address',
    'Residential Address',
    'Submission Date',
    'Normalized Family Name',
    'Normalized Primary Contact',
    'Duplicate Flag',
    'Duplicate Count',
    'Submitted From'
  ]);

  ensureSheet_(ss, 'Parents', [
    'Submission ID',
    'Timestamp',
    'Role',
    'Name',
    'Birth Date',
    'Marital Status',
    'Employment / Occupation',
    'Church Member',
    'Baptised'
  ]);

  ensureSheet_(ss, 'Children', [
    'Submission ID',
    'Timestamp',
    'Name',
    'Birth Date',
    'Contact Details',
    'School / Work',
    'Church Member',
    'Baptised'
  ]);

  ensureSheet_(ss, 'Grandchildren', [
    'Submission ID',
    'Timestamp',
    'Name',
    'Birth Date',
    'School / Work',
    'Spiritual Status',
    'Mother Name',
    'Father Name'
  ]);

  ensureSheet_(ss, 'Monthly Review', [
    'Submission ID',
    'Timestamp',
    'Main Contact Name',
    'Family Name',
    'Primary Contact Number',
    'Email Address',
    'Residential Address',
    'Submission Date',
    'Duplicate Flag',
    'Duplicate Count',
    'Submitted From'
  ]);

  ensureSheet_(ss, 'Possible Duplicates', [
    'Submission ID',
    'Timestamp',
    'Main Contact Name',
    'Family Name',
    'Primary Contact Number',
    'Secondary Contact Number',
    'Email Address',
    'Residential Address',
    'Submission Date',
    'Normalized Family Name',
    'Normalized Primary Contact',
    'Duplicate Flag',
    'Duplicate Count',
    'Submitted From'
  ]);

  formatCoreSheets_(ss);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const mismatch = headers.some(function(header, index) {
      return existingHeaders[index] !== header;
    });
    if (mismatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  sheet.setFrozenRows(1);
}

function appendHousehold_(sheet, row) {
  sheet.appendRow([
    clean_(row.submissionId),
    row.timestamp || new Date(),
    clean_(row.mainContactName),
    clean_(row.familyName),
    clean_(row.primaryContact),
    clean_(row.secondaryContact),
    clean_(row.email),
    clean_(row.address),
    clean_(row.submissionDate),
    clean_(row.normalizedFamilyName),
    clean_(row.normalizedPrimaryContact),
    clean_(row.duplicateFlag),
    Number(row.duplicateCount || 0),
    clean_(row.submittedFrom)
  ]);
}

function appendParent_(sheet, submissionId, timestamp, role, parent) {
  if (!hasData_(parent)) return;
  sheet.appendRow([
    submissionId,
    timestamp,
    role,
    clean_(parent.name),
    clean_(parent.birthDate),
    clean_(parent.maritalStatus),
    clean_(parent.employment),
    clean_(parent.member),
    clean_(parent.baptised)
  ]);
}

function appendChildren_(sheet, submissionId, timestamp, children) {
  children.forEach(function(child) {
    if (!hasData_(child)) return;
    sheet.appendRow([
      submissionId,
      timestamp,
      clean_(child.name),
      clean_(child.birthDate),
      clean_(child.contactDetails),
      clean_(child.schoolWork),
      clean_(child.member),
      clean_(child.baptised)
    ]);
  });
}

function appendGrandchildren_(sheet, submissionId, timestamp, grandchildren) {
  grandchildren.forEach(function(grandchild) {
    if (!hasData_(grandchild)) return;
    sheet.appendRow([
      submissionId,
      timestamp,
      clean_(grandchild.name),
      clean_(grandchild.birthDate),
      clean_(grandchild.schoolWork),
      clean_(grandchild.spiritualStatus),
      clean_(grandchild.motherName),
      clean_(grandchild.fatherName)
    ]);
  });
}

function refreshAdminViews_(ss) {
  const monthlySheet = ss.getSheetByName('Monthly Review');
  const duplicatesSheet = ss.getSheetByName('Possible Duplicates');

  monthlySheet.getRange('A2').setFormula(
    '=IFERROR(FILTER({Households!A2:A,Households!B2:B,Households!C2:C,Households!D2:D,Households!E2:E,Households!G2:G,Households!H2:H,Households!I2:I,Households!L2:L,Households!M2:M,Households!N2:N}, TEXT(Households!B2:B,"yyyy-mm")=TEXT(TODAY(),"yyyy-mm")), {"No records for this month","","","","","","","","","",""})'
  );

  duplicatesSheet.getRange('A2').setFormula(
    '=IFERROR(FILTER(Households!A2:N, Households!L2:L="Possible Duplicate"), {"No duplicates flagged","","","","","","","","","","","","",""})'
  );

  formatAdminSheets_(ss);
}

function countMatchingHouseholds_(sheet, normalizedFamilyName, normalizedPrimaryContact) {
  if (!normalizedFamilyName || !normalizedPrimaryContact) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 10, lastRow - 1, 2).getValues();
  return values.filter(function(row) {
    return clean_(row[0]) === normalizedFamilyName && clean_(row[1]) === normalizedPrimaryContact;
  }).length;
}

function normalizeText_(value) {
  return clean_(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizePhone_(value) {
  return clean_(value).replace(/\D+/g, '');
}

function hasData_(obj) {
  return Object.keys(obj).some(function(key) {
    return clean_(obj[key]) !== '';
  });
}

function clean_(value) {
  return value == null ? '' : String(value).trim();
}

function formatCoreSheets_(ss) {
  ['Households', 'Parents', 'Children', 'Grandchildren', 'Monthly Review', 'Possible Duplicates'].forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;

    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange
      .setFontWeight('bold')
      .setBackground('#111827')
      .setFontColor('#ffffff');

    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 28);

    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    for (var i = 1; i <= lastColumn; i++) {
      sheet.setColumnWidth(i, 160);
    }

    sheet.getDataRange().setWrap(true);

    if (sheet.getBandings().length === 0 && sheet.getLastColumn() > 0) {
      sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), sheet.getLastColumn()).applyRowBanding();
    }
  });

  const households = ss.getSheetByName('Households');
  if (households) {
    households.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    households.getRange('I:I').setNumberFormat('yyyy-mm-dd');
  }

  const parents = ss.getSheetByName('Parents');
  if (parents) {
    parents.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    parents.getRange('E:E').setNumberFormat('yyyy-mm-dd');
  }

  const children = ss.getSheetByName('Children');
  if (children) {
    children.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    children.getRange('D:D').setNumberFormat('yyyy-mm-dd');
  }

  const grandchildren = ss.getSheetByName('Grandchildren');
  if (grandchildren) {
    grandchildren.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    grandchildren.getRange('D:D').setNumberFormat('yyyy-mm-dd');
  }
}

function formatAdminSheets_(ss) {
  const monthly = ss.getSheetByName('Monthly Review');
  if (monthly) {
    monthly.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    monthly.getRange('H:H').setNumberFormat('yyyy-mm-dd');
    monthly.setColumnWidth(7, 260);
    monthly.setColumnWidth(11, 260);
  }

  const duplicates = ss.getSheetByName('Possible Duplicates');
  if (duplicates) {
    duplicates.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
    duplicates.getRange('I:I').setNumberFormat('yyyy-mm-dd');
    duplicates.setColumnWidth(8, 260);
    duplicates.setColumnWidth(14, 260);
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
