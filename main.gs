/**
 * Copy and share Master file to new clients.
 * @returns {void}
 */
function createNew()
{
  const sheetName = 'Updater';
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (ss.getActiveSheet().getSheetName() !== sheetName) {
    showAlert(`Can't run on this sheet.`);
    return;
  }
  if (lastRow === 1) {
    showAlert('Nothing to create.');
    return;
  }

  const range = sheet.getRange('A2:D' + lastRow);
  const headerShift = range.getRow();

  let firstIndex, lastIndex, firstIndexAssigned = false, rowsAreContiguous = true;
  const values = range.getValues().filter((value, index) => {
    const [
      ,
      clientEmail,
      spreadsheetUrl,
      scriptUrl
    ] = value;

    const filter =
      clientEmail !== '' &&
      spreadsheetUrl === '' &&
      scriptUrl === '';

    if (filter) {
      if (!firstIndexAssigned) {
        firstIndex = index;
        lastIndex = index;
        firstIndexAssigned = true;
      }

      if (rowsAreContiguous && index - lastIndex > 1) {
        rowsAreContiguous = false;
      } else {
        lastIndex = index;
      }
    }

    return filter;
  })

  if (!rowsAreContiguous) {
    showAlert('Rows should be contiguous.');
    return;
  }

  const [startCreateAtRow, endCreateAtRow] = [firstIndex + headerShift, lastIndex + headerShift];

  const obj = values.reduce((acc, value) => {
    // create new spreadsheet
    const ssFilename = `<Spreadsheet Name>`;
    const newSpreadsheetId = Drive.Files.create({
      name: ssFilename,
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [FOLDER_ID]
    }).id;
    const newSpreadsheet = SpreadsheetApp.openById(newSpreadsheetId);

    // copy sheets from master spreadsheet
    const masterSheets = SpreadsheetApp.openById(MASTER_FILE_ID).getSheets();
    for (const [index, sheet] of masterSheets.entries()) {
      //  in case there's sheet in master file named 'Sheet1'
      if (sheet.getSheetName() === 'Sheet1') {
        newSpreadsheet.getSheetById(0).setName('to be removed');
      }
      sheet.copyTo(newSpreadsheet).setName(sheet.getSheetName());
    }
    newSpreadsheet.deleteSheet(newSpreadsheet.getSheetById(0)); // the default sheet

    // create new script
    const scriptFilename = `<Script Name>`;
    const url = 'https://script.googleapis.com/v1/projects';
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      payload: JSON.stringify({
        title: ssFilename,
        parentId: newSpreadsheetId
      })
    };
    const response = UrlFetchApp.fetch(url, options);
    const scriptId = JSON.parse(response.getContentText()).scriptId;

    acc.scriptIds.push(scriptId);
    acc.RTVs.push([
      // spreadsheet
      SpreadsheetApp.newRichTextValue()
        .setText(ssFilename)
        .setLinkUrl(newSpreadsheet.getUrl())
        .build(),
      // apps script
      SpreadsheetApp.newRichTextValue()
        .setText(scriptFilename)
        .setLinkUrl(`https://script.google.com/home/projects/${scriptId}/edit`)
        .build()
    ]);

    // share spreadsheet to client
    const clientEmail = value[1];
    try {
      newSpreadsheet.addEditor(clientEmail);
      acc.isValidEmail.push(true);
    } catch (e) {
      acc.isValidEmail.push(false);
    }

    return acc;
  }, {
    scriptIds: [],
    RTVs: [],
    isValidEmail: [] // 1-dim
  });

  updateScriptFile(obj.scriptIds);

  obj.isValidEmail.forEach((valid, index) => {
    if (!valid) {
      const currentRow = startCreateAtRow + index;
      sheet.getRange(`B${currentRow}`).setFontLine('line-through');
    }
  })
  sheet.getRange(`C${startCreateAtRow}:D${endCreateAtRow}`).setRichTextValues(obj.RTVs);
  sheet.getRange(`E${startCreateAtRow}:E${endCreateAtRow}`).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .setAllowInvalid(false)
      .requireCheckbox()
      .build()
  );

}

/**
 * Update selected clients.
 * @returns {void}
 */
function update()
{
  const sheetName = 'Updater';
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();

  if (ss.getActiveSheet().getSheetName() !== sheetName) {
    showAlert(`Can't run on this sheet.`);
    return;
  }
  if (lastRow === 1) {
    showAlert('Nothing to update.');
    return;
  }

  const scriptUrls = sheet.getRange('D2:D' + lastRow).getRichTextValues();
  const checkboxes = sheet.getRange('E2:E' + lastRow).getValues();
  const scriptIds = checkboxes.reduce((acc, item, index) => {
    if (!item[0]) return acc; // filter
    const scriptId = scriptUrls[index][0].getLinkUrl().split('/projects/')[1].split('/')[0];
    if (scriptId) acc.push(scriptId);
    return acc;
  }, []);

  updateScriptFile(scriptIds);

  sheet.getRange('E1:E' + lastRow).setValues(
    Array(lastRow).fill([false])
  );
}

/**
 * Copy-paste all files from Master's script to `scriptIds`.
 * @param {string[]} scriptIds 
 * @returns {void}
 */
function updateScriptFile(scriptIds)
{
  if (scriptIds.length === 0) {
    showAlert('Nothing to update.');
    return;
  }

  // get payload from master script
  const url = `https://script.googleapis.com/v1/projects/${MASTER_SCRIPT_ID}/content`;
  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    }
  };

  let payload;
  try {
    payload = UrlFetchApp.fetch(url, options);
  } catch (err) {
    console.log(err);
    showAlert('There seems to be an issue. Please try again in a few moments.');
    return;
  }

  const requests = scriptIds.reduce((acc, scriptId) => {
    acc.push({
      url: `https://script.googleapis.com/v1/projects/${scriptId}/content`,
      method: 'put',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      payload: payload
    });

    return acc;
  }, []);

  UrlFetchApp.fetchAll(requests);
}

/**
 * Delete selected clients. Uses `delete_` because `delete` is a reserved word.
 * @returns {void}
 */
function delete_()
{
  const sheetName = 'Updater';
  const sheet = ss.getSheetByName(sheetName);
  let lastRow = sheet.getLastRow();

  if (ss.getActiveSheet().getSheetName() !== sheetName) {
    showAlert(`Can't run on this sheet.`);
    return;
  }
  if (lastRow === 1) {
    showAlert('Nothing to delete.');
    return;
  }

  const files = sheet.getRange('C2:C' + lastRow).getRichTextValues();
  const checkboxes = sheet.getRange('E2:E' + lastRow).getValues();
  checkboxes.forEach((item, index) => {
    if (item[0]) {
      // delete from sheet
      const rowIndex = index + 2;
      sheet.deleteRow(rowIndex);
      // delete from drive
      const ssId = files[index][0].getLinkUrl().split('/spreadsheets/d/')[1].split('/')[0];
      DriveApp.getFileById(ssId).setTrashed(true);
    }
  });

  lastRow = sheet.getLastRow(); // lastRow has changed
  sheet.getRange('E1:E' + lastRow).setValues(
    Array(lastRow).fill([false])
  );
}
