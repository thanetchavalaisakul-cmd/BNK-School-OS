# QA — v5.0.16 Responsive Adaptive UI

Checklist:
- JS syntax check passes.
- CSS parses with balanced braces.
- Cache/build references updated to 5.0.16.
- Sidebar scrim exists and mobile open/close uses shared helper.
- Responsive table enhancer excludes official PDF/A4 structures and editable/complex tables.
- Mobile CSS includes 820px, 640px, 420px breakpoints and landscape-phone handling.
- Procurement Master Form retains desktop multi-column layout and becomes one column on phone.
- Official procurement PDF classes are not modified by the responsive-table enhancer.
- No SQL changes required.
- Static HTTP smoke test completed for index.html/styles.css.
- ZIP integrity checked with unzip -t.
