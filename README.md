# Apps Script Management

## Overview
This Google Apps Script solution simplifies managing Apps Script projects for multiple clients. This solution is especially useful for scenarios where you provide Apps Script solutions to clients. When you update the script in master file, changes can be propagated to all clients with a single click.

This project uses Google Sheets as an example of a master file. To work with other file types, change `mimeType` in `createNew` function.

### Key features
- **Create client file:** Generate client-specific files based on a master template.
- **Manage updates:** Propagate script updates from the master file to all client files.

## How it works
1. Master file is the template. Master script is Apps Script bound to master file.
2. The Apps Script:
    - When create new client:
      - Create a new file and share it to client as editor.
      - Create a new apps script project and binds it to the newly created file.
      - Copy sheets from master file to client's file.
      - Copy scripts from master script to client's file.
    - When update client's file:
      - Propagates latest-script from master script to client's file (all clients or selected clients).
    - When delete client's file:
      - Delete client's file (all clients or selected clients).

## Installation

### GCP Project configuration
Enable the following API in your GCP project:
- Apps Script API.

### Apps Script configuration
- Turn on **Google Apps Script API** at [Apps Script -> Settings](https://script.google.com/home/usersettings).
- Link Apps Script to GCP Project at **Apps Script -> Project Settings -> Google Cloud Platform (GCP) Project**.
- Set up Script Properties in **Apps Script -> Project Settings -> Script Properties**:
   ```
   {
     FOLDER_ID: <where the copied file go>,
     MASTER_FILE_ID: <file to be copied>,
     MASTER_SCRIPT_ID: <apps script bound to the master file>
   }
   ```
- Configure the `appsscript.json` file:
   ```json
  {
    "dependencies": {
      "enabledAdvancedServices": [
        {
          "userSymbol": "Drive",
          "version": "v3",
          "serviceId": "drive"
        }
      ]
    },
    "oauthScopes": [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/script.external_request",
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/drive"
    ]
  }
  ```

### Sheets configuration
**DO NOT** change sheets name, delete columns, or re-arrange columns for the following ranges:
- Read
  ```
  'Updater'!A2:E
  ```
- Write
  ```
  'Updater'!A2:E
  ```

Sheets layout:
![image](https://github.com/user-attachments/assets/1fe96c11-4c9e-4692-9875-ea126a97a240)

## Usage
1. Access the **Custom Menu** located in the toolbar.
    - **Custom Menu -> Create new:** create new client's file.
    - **Custom Menu -> Update:** propagates latest-script from master file to client's file.
    - **Custom Menu -> Delete:** delete client and their related file.
2. When **Create new** Col-A and Col-B should NOT empty, while Col-C and Col-D should empty.
3. Strikethrough in Col-B means email address cannot be associated with a google account, meaning: files (docs, sheets, etc) cannot be shared to that email address.

## Caveats
At the current state, there are no functions/methods to get *ScriptID* from *SpreadsheetID*. The feature has been requested [here](https://issuetracker.google.com/issues/111149037). To workaround this the script has to call APIs back-and-forth between Sheets and Projects. This caused the script consumes ~20s to create new file for each client. Under normal circumstances this shouldn't be a problem. If you need to add hundreds of new clients daily, consider revising the `createNew` function to execute tasks in parallel using `UrlFetchApp.fetchAll()`. See [this example workflow](https://github.com/sangnandar/Load-CSVs-from-GCS-to-BigQuery).

Update client's file already run in paralel.

## Future enchancements
- For scenario where provided solution has webapp deployment, include re-deployment after committing update.
- For scenario where each client has unique variables, include `PropertiesService` setup using `scripts.run` method.
