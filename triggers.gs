function onOpen()
{
  ui
    .createMenu('Custom Menu')
      .addItem('Create new', 'createNew')
      .addSeparator()
      .addItem('Update', 'update')
      .addItem('Delete', 'delete_')
    .addToUi();
}

function onEdit(e)
{
  const sheet = e.range.getSheet();
  const sheetName = sheet.getSheetName();
  const thisRow = e.range.getRow();
  const thisCol = e.range.getColumn();

  if (sheetName === 'Updater' && thisRow === 1 && thisCol === 5) {
    // select all rows
    const headerShift = 1;
    const numRows = sheet.getLastRow() - headerShift;
    sheet.getRange(thisRow + headerShift, thisCol, numRows).setValues(
      Array(numRows).fill([e.value])
    );
  }
}
