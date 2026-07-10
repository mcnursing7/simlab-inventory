// Avery sheet-label templates. Measurements are the vendor's published
// spec-sheet numbers, in inches. When printing (or saving to PDF), use
// "Actual Size" / 100% scale — "Fit to page" will drift the grid off
// the die-cut labels. Run one test sheet on plain paper before a big
// batch and hold it up to a real label sheet to confirm alignment.
export const AVERY_TEMPLATES = {
  '5163': {
    name: 'Avery 5163 — 2" x 4" (10/sheet)',
    cols: 2, rows: 5, labelW: 4, labelH: 2,
    marginTop: 0.5, marginLeft: 0.15625, colGap: 0.1875, rowGap: 0,
  },
  '5164': {
    name: 'Avery 5164 — 3.33" x 4" (6/sheet)',
    cols: 2, rows: 3, labelW: 4, labelH: 3.33,
    marginTop: 0.5, marginLeft: 0.15625, colGap: 0.1875, rowGap: 0,
  },
  '5160': {
    name: 'Avery 5160 — 1" x 2.625" (30/sheet)',
    cols: 3, rows: 10, labelW: 2.625, labelH: 1,
    marginTop: 0.5, marginLeft: 0.1875, colGap: 0.125, rowGap: 0,
  },
}

export const DEFAULT_TEMPLATE = '5163'
export const PAGE_W_IN = 8.5
export const PAGE_H_IN = 11
