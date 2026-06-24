# CalTIMS System Bug Report

**Date:** June 23, 2026  
**Audited Components:** Payroll Compliance Engine & Timesheet Module  
**Overall Status:** Operational with 4 Critical Compliance/Workflow Gaps  

---

## Bug 1: Backend PF Wage Ceiling Restriction Bypass

* **Severity:** High (Calculates incorrect EPF/EPS contributions for salaries > ₹15,000 when ceiling restriction is disabled)
* **Component:** Backend Payroll Engine
* **File:** `backend/src/modules/payroll/payroll.service.js`
* **Line:** [Line 277](file:///d:/apps/caltims%20mobile%20app/backend/src/modules/payroll/payroll.service.js#L277)

### Description
In the organization policy settings, admins can turn off **Restrict to Wage Ceiling (₹15,000)** so that Provident Fund is computed on the full Basic + DA. However, the backend calculation script unconditionally runs a `Math.min` operation using `15,000` as a hard limit.

### Steps to Reproduce
1. In Settings, disable the **Restrict to Wage Ceiling (₹15,000)** flag for PF.
2. Process payroll for an employee with a basic salary of ₹30,000.
3. Compare the calculated PF deduction.

### Behavior Analysis
* **Expected Behavior:** PF is computed on ₹30,000 (e.g., `30,000 * 12% = ₹3,600`).
* **Actual Behavior:** PF is capped and computed on ₹15,000 (`15,000 * 12% = ₹1,800`).

### Remediation
Update line 277 in `payroll.service.js`:
```diff
- const pfBase = Math.min(basic, statutory.pf.wageLimit || 15000);
+ const pfBase = (statutory.pf.restrictToCeiling !== false)
+   ? Math.min(basic, statutory.pf.wageLimit || 15000)
+   : basic;
```

---

## Bug 2: Backend ESI Non-Compliant Rounding

* **Severity:** Medium (Statutory compliance violation under ESI Rule 57)
* **Component:** Backend Payroll Engine
* **File:** `backend/src/modules/payroll/payroll.service.js`
* **Line:** [Line 287-288](file:///d:/apps/caltims%20mobile%20app/backend/src/modules/payroll/payroll.service.js#L287-L288)

### Description
Statutory ESI rules require individual ESI contributions to be rounded up to the next rupee (i.e., using `Math.ceil`). While the frontend handles this correctly, the backend calculates it as a precise float and applies general rounding at the very end of the payroll sheet, leading to variance.

### Steps to Reproduce
1. Set the ESI rate to `0.75%`.
2. Process payroll for a gross wage of ₹10,250.
3. Observe ESI deduction value.

### Behavior Analysis
* **Expected Behavior:** `Math.ceil(10,250 * 0.0075) = Math.ceil(76.875) = ₹77`.
* **Actual Behavior:** Calculated as `₹76.88` (or rounded standard off based on decimal rule).

### Remediation
Update line 287 in `payroll.service.js`:
```diff
- const esiVal = (breakdown.grossEarnings * (statutory.esi.employeeRate || 0.75)) / 100;
+ const rawEsiVal = (breakdown.grossEarnings * (statutory.esi.employeeRate || 0.75)) / 100;
+ const esiVal = Math.ceil(rawEsiVal);
```

---

## Bug 3: Frontend PT Slab Lookup Failure for Open-Ended Slabs

* **Severity:** Medium (Causes Professional Tax to show ₹0 on frontend for high income earners)
* **Component:** Frontend Mobile App / Compliance Engine
* **File:** `frontend/src/features/payroll/complianceEngine.ts`
* **Line:** [Line 50](file:///d:/apps/caltims%20mobile%20app/frontend/src/features/payroll/complianceEngine.ts#L50)

### Description
The frontend PT finder searches the slab configs using `salary >= s.min && salary <= s.max`. If the highest slab has no `max` set, or has `max` set to `null`/`undefined`, the expression returns `false` and professional tax defaults to `0`.

### Steps to Reproduce
1. Configure a state PT rule where the last slab is open-ended (e.g., salary above ₹20,000 has tax ₹200, with no upper boundary).
2. Execute a sandbox calculation for ₹25,000.
3. Observe the PT output.

### Behavior Analysis
* **Expected Behavior:** PT matches the last slab and returns ₹200.
* **Actual Behavior:** Returns ₹0.

### Remediation
Update line 50 in `complianceEngine.ts`:
```diff
- const slab = config.slabs.find((s: any) => salary >= s.min && salary <= s.max);
+ const slab = config.slabs.find((s: any) => salary >= s.min && (!s.max || salary <= s.max));
```

---

## Bug 4: Timesheet Freeze Policy Mismatch

* **Severity:** Medium (Operational workflow inconsistency and bypass vulnerability)
* **Component:** Timesheet Service (Backend API vs. Mobile UI)
* **Files:** `backend/src/modules/timesheets/timesheet.service.js` vs `frontend/src/screens/timesheets/TimesheetEntryScreen.tsx`

### Description
The frontend UI enforces a weekly auto-lock policy (e.g. freezing timesheets on Monday at 18:00 of the following week). The backend API, however, only blocks edits using `getFreezeInfo` which relies on a monthly day-of-month cutoff (e.g., the 28th of the month). Thus, users can bypass the weekly block and write to the database via API clients.

### Steps to Reproduce
1. Let the weekly submission lock deadline pass (e.g. Wednesday of the next week).
2. Notice that the mobile UI locks editing.
3. Send a PUT/POST request to `/api/timesheets/bulk` updating hours for that week.

### Behavior Analysis
* **Expected Behavior:** API rejects the write, returning a `400 Bad Request` stating the timesheet is frozen.
* **Actual Behavior:** API accepts the write and updates the timesheet because the 28th of the month has not yet passed.
