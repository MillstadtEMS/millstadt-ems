# Board Budget Workbook

Date: July 22, 2026

The Board portal budget surface is a shared read-only workbook viewer at `/board/referendum`.

## Current Behavior

- The bundled fallback workbook lives at `public/board/referendum/current.xlsx`.
- The bundled fallback viewer snapshot lives at `public/board/referendum/current.json`.
- Kenneth James and Joe Wagner can upload a replacement `.xlsx` from `/board/referendum`.
- Uploaded workbooks are stored in Vercel Blob at `board-workbook/current.xlsx`.
- The generated viewer snapshot is stored in Vercel Blob at `board-workbook/current.json`.
- Board members can switch workbook scenarios locally in the viewer. This does not save a new workbook or affect anyone else.
- Kenneth James and Joe Wagner can choose which workbook tabs are visible to the EMS Board and Fire Board.

## Removed Legacy Flow

The old cached budget model is no longer part of the app. The portal no longer imports workbook figures into cache tables, no longer runs a remote spreadsheet sync, and no longer exposes separate model subsection pages.
