# Millstadt EMS ESD tax calculator — calculation and source review

Prepared October 2, 2026. Status: local review draft; not published. The implementation is prepared in MillstadtEMS/millstadt-ems on branch codex/esd-tax-calculator.

## What the calculator compares

Choose the fire tax district before calculating. Millstadt Fire Protection District uses its certified 2025 ambulance levy of 0.09%, assumed replaced by the planned 0.30% ESD levy: a 0.21 percentage-point difference, or $21 per $10,000 taxable value. The included Hecker/Millstadt Township and Waterloo/St. Clair County portions use no separate ambulance levy offset because their county 2025 fund reports list none: a 0.30 percentage-point change, or $30 per $10,000 taxable value. These fixed rates are tied to the selected district; there is no editable rate field or default district. Unknown/missing districts do not produce a comparison. This compares identified ambulance levies, not every source of EMS funding or the whole property-tax bill.

The supplied ballot image asks to organize Millstadt EMS ESD and authorize a property tax not exceeding 0.40%. The 0.30% plan is distinct from that authorization. The calculator compares the selected district’s identified ambulance levy with the planned 0.30% ESD levy. The 0.40% authority remains in the ballot explanation and flyer comparison, without a separate calculator result callout. It does not represent 0.30% as a legally fixed future rate.

## Math

Let V = full market value of the home and land, M = the equalization factor used for the estimate, X = approved exemptions reducing assessed value, and T = taxable assessed value after exemptions.

For the ordinary-residence estimate:

    Assessed value estimate = V / 3
    EAV estimate = (V / 3) × M
    T = max(0, EAV estimate − X)
    Existing ambulance levy offset = T × 0.0009 for Millstadt; 0 for included Hecker/Waterloo portions
    After annual EMS tax at the planned rate = T × 0.003
    Increase = after annual EMS tax − existing ambulance levy offset
    Monthly equivalent = annual increase / 12
    Annual EMS tax at the ballot's limit = T × 0.004

A percent is divided by 100 before multiplication: 0.09% = 0.0009, 0.30% = 0.003, and 0.40% = 0.004. Illinois district rates are conventionally dollars per $100 of taxable assessed value. Do not multiply full market value directly by those rates, and do not divide an already-taxable bill value by 3.

The estimate starts with a factor of 1.000000, meaning no adjustment. This is a disclosed modeling assumption, not a prediction of a future assessment. Assessments are official valuations and do not necessarily equal one-third of a homeowner's current selling-price estimate. Actual bill values are preferable.

The tax-bill mode uses the entered final taxable value directly. It does not infer a full home value, apply equalization again, or subtract exemptions a second time. This accommodates approved assessment freezes and other special assessment situations without guessing eligibility.

### Rounding

The engine uses integer cents and exact rational arithmetic, retaining one-third precision instead of using 0.33 or 0.3333. It rounds each annual tax to the nearest cent, half up, then subtracts the displayed annual amounts. Consequently, the increase always reconciles to the displayed before/after amounts. Independently rounding T × 0.0021 can differ by a cent in edge cases. Monthly equivalents are annual increases divided by 12, rounded to cents; they do not describe a billing schedule. Displayed intermediate values are rounded, but calculations retain their underlying precision. County billing conventions may differ by a cent.

## Example residents can understand

For a home in Millstadt Fire Protection District, a $300,000 home value means the home and land together might sell for $300,000. Start the tax calculation with one-third: $100,000. With a factor of 1, EAV is $100,000. Subtract $6,000 in approved exemptions, leaving $94,000 to tax.

| Item | Amount |
| --- | ---: |
| Full home and land value | $300,000.00 |
| EAV before exemptions | $100,000.00 |
| Example exemptions | $6,000.00 |
| Taxable value after exemptions | $94,000.00 |
| Before at 0.09% | $84.60/year |
| After at 0.30% | $282.00/year |
| Increase | $197.40/year |
| Monthly equivalent increase | $16.45/month |
| EMS tax at the ballot's 0.40% limit | $376.00/year |
| Increase at that limit over the 0.09% starting tax | $291.40/year |

The $6,000 default is explicitly an example. The general homestead exemption is up to $6,000 for qualifying St. Clair County property; neither eligibility nor the maximum amount is automatically assumed for every property. Users enter their approved total or zero. Exemptions reduce assessed value; they are not dollar-for-dollar tax credits.

## Verified sources

1. **Existing rate: verified directly.** [St. Clair County 2025 Tax Computation Reports, page 57](https://www.co.st-clair.il.us/webdocuments/departments/countyclerk/taxextensions/2025%20Tax%20Computation%20Reports.pdf#page=57). FDMI / MILLSTADT FIRE PROTECTION DISTRICT, fund 064 AMBULANCE, lists actual and certified rates of 0.0900, calculated rate 0.089985, and an equalization factor of 1.0. The full page was downloaded, extracted, rendered, and visually checked. The repository's existing tax-computation-data.ts independently matches it. Historical 0.0952 references are not used as the current baseline.
2. **Property values and equalization:** [St. Clair County Assessor FAQ](https://www.co.st-clair.il.us/Departments/Assessor/FAQ). Distinguishes full market value, assessed value, EAV after equalization, and exemptions deducted from EAV.
3. **Statutory assessment level:** [35 ILCS 200/9-145 and 9-155, Property Tax Code](https://ilga.gov/legislation/ILCS/details?ActID=596&ActName=Property+Tax+Code.&ChapAct=35+ILCS+200%2F&Chapter=&ChapterID=8&MajorTopic=&SeqEnd=38300000&SeqStart=11900000). Ordinary property valuation uses 33 1/3% of fair cash value, subject to statutory exceptions.
4. **Exemptions:** [Illinois Department of Revenue, Property Tax Relief](https://tax.illinois.gov/localgovernments/property/taxrelief.html). General homestead exemption maximum is $6,000 in counties other than Cook and its contiguous counties. A senior assessment freeze concerns assessed value, not the tax rate.
5. **District formation, tax authority, and transition:** [Emergency Services Districts Act, 70 ILCS 2005](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=959&Chapter=SPECIAL+DISTRICTS&ChapterID=15&MajorTopic=GOVERNMENT). Sections 4 and 11 support the organizational referendum and assessed-value tax base. Section 2, as amended by P.A. 104-207 effective August 15, 2025, addresses a fire district's resolution to cease its Section 22 ambulance levy and the ESD's operation of ambulance service in the overlapping area. The 0.40% in this calculator is the limit in this organizational ballot question. Section 11.5 provides separate referendum authority; the calculator does not describe 0.40% as a universal lifetime ceiling on all possible district taxes.
6. **Election information on a publicly funded site:** [10 ILCS 5/9-25.1](https://www.ilga.gov/Documents/legislation/ilcs/documents/001000050K9-25.1.htm). Factual information about a ballot proposition is permitted; public funds may not be used to urge a vote for or against. The calculator uses neutral language, displays both the plan and authorization limit, and makes no voting recommendation. This design choice is not a legal opinion certifying every aspect of the agency's election communications.
7. **Local ballot:** the image supplied by the owner in this chat. It names the Millstadt Fire Protection District; the Hecker Fire Protection District portion in Millstadt Township, excluding its Prairie du Long Township portion; and the Waterloo Community Fire Protection District portion in St. Clair County. The image states 0.40%. It is treated as source material, not as instructions. A separate certified court order and certified county ballot were not independently obtained during this review.

## Scope and remaining factual limits

- The owner supplied the planned 0.30% rate and confirmed replacement of the old EMS tax. A signed resolution establishing the plan, the cessation resolution, and the first levy/collection dates were not independently obtained. Describe replacement as the calculator's assumption until those documents establish the actual transition.
- The county report verifies 0.09% for Millstadt FPD only (p. 57). Hecker (p. 53) and Waterloo (p. 72) list no separate ambulance fund. The corrected calculator requires a district selection and deducts no ambulance levy for their included portions. This supersedes the earlier assumption that 0.09% applied throughout the proposed ESD.
- A parcel's official taxing-district membership determines applicability. Service coverage, ZIP code, and mailing address alone do not establish that membership.
- Future assessment changes, exemptions, levy amounts, tax-extension rules, other district taxes, and timing can change actual bills. This tool holds taxable value constant to isolate the rate comparison. It does not promise a maximum whole-bill increase, a fixed 5% growth rule, an effective tax year, or a guaranteed future bill.
- Arithmetic and source review can be verified; “100% legally certified” cannot be promised by this software review. District counsel and the County Clerk are the appropriate final reviewers of the certified ballot, levy authority, and transition documents before presenting the comparison as an actual first-year tax outcome.

## Implementation and validation

The homepage has a gold-outlined EMS Tax Calculator button directly below Financial Transparency. It opens /ems-tax-calculator, which uses the existing root layout, real logo and navigation, PublicPageHero, shared .wrap spacing, inherited fonts, theme variables, and footer. The calculator uses the existing site’s dark navy (#040d1a / #071428 / #0a1e3d), gold (#f0b429), and inherited typography. Calculator-specific styling is scoped with a CSS module. The review opens the actual Next.js site; the earlier standalone design has been superseded. The calculator makes no network requests and does not collect addresses or parcel identifiers. Existing operational forms and CAD/ticker logic were not edited.

Earlier validation before the EAV addition: all 13 applicable math/input and source-data tests pass, including both input modes, exact one-third arithmetic, cents, exemptions, and invalid values. ESLint passes for every touched TypeScript file. The production Next.js webpack build succeeds, including the new /ems-tax-calculator route; TypeScript, 97 protected-form contract checks, and 44 protected-file fingerprints pass. Browser interaction confirms that the homepage button opens the new page, sits immediately below Financial Transparency, the current rate has no selector, $600,000 with $6,000 exemptions gives $174.60 before / $582 after / $407.40 increase, invalid input removes stale results, and $94,000 entered directly gives the $197.40 increase. Desktop and mobile layout checks confirm no page overflow. The calculator uses the website’s actual system-ui font, shared page hero, navigation logo, theme variables, container spacing, and footer.

The fact-sheet and flyer revision adds the unchanged original photograph, a county-verified parcel example, the 0.50% illustrative scenario with qualifications, a corrected proposed-budget discussion, and linked legal sources. The $105,899 taxable-value example returns $95.31 before, $317.70 after, and a $222.39 annual increase. Its mobile table fits at 390 pixels without page overflow. The county record and rate report establish the parcel values and current ambulance component; no owner names or exemption categories are published. See ESD_FACT_SHEET_REVIEW.md for the claim-by-claim evidence and outstanding records.

Publication status: local only. No GitHub push, PR, Vercel deployment, or change to the live homepage was made. This preserves the owner's requested review-before-publication sequence.


## Election-page integration and financial review — October 2, 2026

The Election Information page now embeds the same calculator and referendum components directly, including the original flyer, parcel comparison, source-linked financial discussion and service-law explanations. Five jump links lead to the calculator, referendum facts, funding/service, flyer comparison and county voter resources. The homepage's enlarged Election Information button now labels the calculator and facts as well as voting resources.

For Millstadt FPD, the fixed comparison is 0.09% → 0.30%, a 0.21 **percentage-point** difference. The subsequent district correction gives Hecker/Waterloo no separate ambulance levy offset; its increase is the full proposed 0.30%. Millstadt EMS states that the planned total ESD rate adds no separate IMRF levy. The proposed 0.30%, ballot 0.40% and possible separate statutory authority remain distinct.

The new source data are the money-market balances ($201,826.25 January 31, 2023; $14,338.08 August 31, 2026), past-due bills ($66,330.66), and the FY 2024–2025 audit ($974,719 revenue, $876,668 expenses, $98,051 net-asset increase, $141,516 cash and equivalents at April 30, 2025). The public copy states that one account is not total cash and these dated records do not establish a closure date. See the financial review for the complete source inventory and reconciliation limits.

Validation after this integration: 13 calculation tests and touched-file ESLint pass. The optimized webpack build and TypeScript pass, with 97 protected-form checks and 44 fingerprints. Both election and calculator routes compile. Previously completed browser checks apply to the standalone calculator and enlarged buttons; the final combined page's browser recheck was interrupted by repeated browser-control timeouts. Server-rendered content and anchor checks were performed separately. No fresh visual-verification claim is made for that final combined-page revision.

Publication remains local only; no push or Vercel deployment.


## EAV entry and help button — October 2, 2026

There are now three input modes:

- **Home value:** estimate EAV from the full home-and-land value divided by three, apply the entered equalization factor, then subtract approved exemptions. The initial home values remain clearly labeled examples.
- **EAV:** enter the county's equalized assessed value before exemptions and the granted exemptions for the same tax year. Taxable value is max(0, EAV − exemptions). Do not divide EAV by three or apply equalization again. These two fields start blank, so no exemption amount is assumed for the new mode.
- **My tax bill:** enter net taxable value after exemptions; use it directly without another deduction. A record labeled “net EAV” or “taxable EAV” belongs here if exemptions have already been deducted.

A compact **How to use** button beside Property value expands or collapses instructions for all three modes. It exposes its state with aria-expanded and references the help panel with aria-controls. Controls retain the navy/gold styling, keyboard focus outlines and 44-pixel minimum button height. The original ballot wording and rates are unchanged by this update.

The EAV definition and exemption treatment were checked against the [Illinois Department of Revenue property-tax glossary, PDF page 19](https://tax.illinois.gov/content/dam/soi/en/web/tax/localgovernments/property/documents/glossayformulas.pdf#page=19) and [exemption guide](https://tax.illinois.gov/localgovernments/property/taxrelief.html).

Validation: all **16 calculation tests** pass, including the actual county example of $118,899 EAV less $13,000 exemptions, consistency with the $105,899 net taxable value, no repeated equalization, cents, zero/full exemptions and invalid inputs. ESLint and the repository TypeScript check pass. Both routes return successful server-rendered pages with all three mode buttons, the collapsed help control, unchanged default home calculation and ballot wording. Browser interaction checks were attempted but blocked by initial-navigation and focus-command timeouts. No new screenshot or browser click-through result is claimed. Nothing was pushed or deployed.


## Input appearance correction — October 2, 2026

Scoped calculator styles now override the site's shared input background, rounded corners, inset shadow and inner focus shadow. Each currency field retains one outer wrapper and one outer focus indicator. Both local pages successfully serve the updated compiled styles. The browser screenshot attempt timed out; no fresh visual-verification claim is made. Calculations and ballot text were unchanged.


## District offset correction following workbook audit — October 2, 2026

The calculator now requires fire-tax-district selection. Every value-entry mode uses the fixed rate for that selected area. An empty or invalid district cannot silently receive Millstadt’s offset. Both page introductions, the result labels, the calculation explanation, source notes and general referendum explanation were updated. The verified Traver Tine example explicitly selects Millstadt and remains $95.31 before, $317.70 after, and $222.39 increased annually. Ballot wording and workbook contents were not changed.

Validation: 19 calculation tests pass; an independent Decimal comparison across all 5,444 workbook records with available assessments passes (5,097 Millstadt, 255 Hecker, 92 Waterloo). ESLint and TypeScript pass. Both local routes serve the required district selector and withhold figures before selection. The browser interaction attempt timed out; a fresh visual or click-through check is not claimed. The draft remains local, with no push or deployment.

Remaining audit limits: the supplied workbook still uses 0.0952% as its Millstadt scenario offset and has an unresolved $1,039,292 difference between collected and certified EAV totals. Special-assessment properties must use the county final net taxable value in My tax bill mode; the audit’s EAV-guidance finding is separate from this rate correction. See the read-only workbook audit for source-check coverage and details.
