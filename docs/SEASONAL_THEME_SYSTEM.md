# Seasonal Theme System

The public site keeps normal Millstadt EMS branding unless an owner-approved
window or manual override is configured. There are no hard-coded activation
dates and no holiday-specific page copies.

## Configuration

- `DISABLE_PUBLIC_SEASONAL_THEMES=true` forces normal branding immediately.
- `PUBLIC_SEASONAL_THEME_OVERRIDE=<id>` manually selects a theme. Use `normal`
  to manually deactivate seasonal treatment.
- `PUBLIC_SEASONAL_THEMES_JSON` contains up to 24 local-time windows. Times are
  interpreted in `America/Chicago` and use `YYYY-MM-DDTHH:mm`.

Example development value:

```json
[
  {
    "id": "halloween",
    "startsAt": "2026-10-24T07:00",
    "endsAt": "2026-11-01T02:00",
    "enabled": true
  }
]
```

Supported IDs are `halloween`, `thanksgiving`, `winter`, `veterans-day`,
`memorial-day`, and `independence-day`. Veterans Day and Memorial Day use
restrained, non-playful accents. Invalid entries fail closed and normal branding
continues.

## Presentation

Themes change only a narrow navigation accent. They do not replace the logo,
change public-safety status colors, add sound, add motion, or alter page content.
The Visual Editor preview can show each treatment without saving or publishing
content. The preview query is cosmetic and has no authorization effect.

## Operations

1. Review the exact activation window with the owner.
2. Add the JSON in Preview first and inspect desktop/mobile contrast.
3. Copy the approved value to Production only through a separate production
   configuration change.
4. Set `DISABLE_PUBLIC_SEASONAL_THEMES=true` for the emergency fallback.
