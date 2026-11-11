# Sweety demo walkthrough

Use a fresh local database, run the migrations and demo seed, then open the app. Use the synthetic demo account in the README. The walkthrough takes about 2½ minutes.

| Time | On screen |
| --- | --- |
| 0:00–0:25 | Log in as Alex. On Overview, show today's four slots and the daily summary. Refresh to show that the session persists. |
| 0:25–0:55 | Open the empty After dinner slot and submit an empty value to show validation. Enter 118 mg/dL and save. The dashboard should show four entries and updated statistics. |
| 0:55–1:25 | Open Readings. Edit the dinner value to 121 mg/dL, then open the delete confirmation. Cancel once before confirming deletion. |
| 1:25–2:05 | Open Reports. Show the daily readings, switch to Month to date, then Previous month. Point out the displayed date ranges. Select a date outside the seeded periods to show the empty state. |
| 2:05–2:30 | Narrow the viewport to phone width, show the navigation and cards, then log out. Open the Reports URL again to show it redirects to login. |

Run the Playwright screenshot command in the README before changing the seeded readings if you want images of the default demo account.
