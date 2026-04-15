# Performance Route Matrix

Use this matrix when collecting Lighthouse and Web Vitals baselines before and after optimization work.

## Priority routes

- `/` - marketing home
- `/pricing` - monetization and conversion
- `/founder` - founder landing
- `/investor` - investor landing
- `/founder/dashboard` - high-interaction app entry

## Tracking checklist

For each route, record:

- LCP (ms)
- INP (ms)
- CLS
- JS payload (KB)
- CSS payload (KB)
- TTFB (ms)

## Regression guardrails

- LCP <= 2500ms
- INP <= 200ms
- CLS <= 0.1
- JS bundle <= 280KB per priority route
- Total CSS <= 180KB
