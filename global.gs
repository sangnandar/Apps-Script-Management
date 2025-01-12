/**
 * Global variables and helper functions
 */

var ui; // return null if called from script editor
try {
  ui = SpreadsheetApp.getUi();
} catch (e) {
  Logger.log('You are using script editor.');
}
const ss = SpreadsheetApp.getActiveSpreadsheet();
const scriptProps = PropertiesService.getScriptProperties();

const {
  MASTER_FILE_ID,
  MASTER_SCRIPT_ID,
  FOLDER_ID
} = scriptProps.getProperties();

function showAlert(message)
{
  if (ui) {
    ui.alert(message);
  } else {
    Logger.log(message);
  }
}
