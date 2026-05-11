# Tasks: EPIC-005 — Absence Reporting

**Sprint**: 2 | **Days**: 3–4 | **Spec Priority**: P2 | **User Story**: US2
**Platform**: 🟢 Time Management Platform — all frontend work targets `frontend-time_management/`; backend routes are shared API
**Assignees**: Dev 2 (backend) + Dev 4 (frontend)
**Depends on**: EPIC-001 (auth + monthLock middleware, UPLOAD_DIR env var)
**Blocks**: EPIC-006 (absence records feed into COMPLETE day-status calculation)

**Acceptance Criteria**:
- SICK_LEAVE saved → status=DOCUMENT_PENDING + documentRequired flag in response
- Fri/Sat excluded: absence over 2026-05-08 (Fri) to 2026-05-12 (Tue) → calculatedAbsenceDays=3
- Locked month → 423 on POST/PATCH/DELETE; document upload succeeds even on locked month (FR-025)
- Second upload replaces first AbsenceDocument record and overwrites file
- Employee sees doc-required badge in UI until file uploaded; partial-day checkbox prompts work-report reminder

---

## Phase 1: Absence Report API (User Story: US2)

- [ ] T001 [US2] Implement AbsenceService.createAbsence({userId, absenceType, startDate, endDate, isPartial, partialDurationHours?}): validate endDate ≥ startDate (422 "תאריך סיום חייב להיות אחרי תאריך ההתחלה"); calculate calculatedAbsenceDays by iterating each date in [startDate, endDate] inclusive and skipping days where dayOfWeek ∈ {5, 6} (Fri=5, Sat=6 using ISO 8601); set status DOCUMENT_PENDING if absenceType is SICK_LEAVE or MILITARY_RESERVE, else SUBMITTED; check month lock for startDate year-month (423 if locked and not ADMIN); insert AbsenceReport; return record with documentRequired boolean flag (true if status=DOCUMENT_PENDING): backend/src/services/absence.service.ts
- [ ] T002 [US2] Implement AbsenceService.updateAbsence(id, data, actorUserId): 403 if not owner and not ADMIN; 404 if not found; check month lock for startDate month (423); recalculate calculatedAbsenceDays if dates changed; update record; AbsenceService.deleteAbsence(id, actorUserId): 403 check, month-lock check (423), soft-delete by setting updatedAt (AbsenceReport has no deletedAt — use a deleted flag or remove row — per schema: no deletedAt on AbsenceReport, so hard delete or add deletedAt; follow data-model.md — AbsenceReport has no deletedAt field so hard delete); AbsenceService.listAbsences(userId, year, month) → AbsenceReport[] with AbsenceDocument: backend/src/services/absence.service.ts (extend)
- [ ] T003 [US2] Implement POST /absences (authenticateToken, Zod body: {absenceType: AbsenceType enum, startDate: ISO date string, endDate: ISO date string, isPartial: boolean, partialDurationHours?: number}, apply checkMonthLock using startDate, 201 response), PATCH /absences/:id (authenticateToken, checkMonthLock, partial body, 200), DELETE /absences/:id (authenticateToken, checkMonthLock, 204), GET /absences?userId=&year=&month= (authenticateToken; employee can only query own userId, admin any) routes; register absences router in backend/src/app.ts: backend/src/routes/absences.ts, backend/src/app.ts (extend)

---

## Phase 2: Document Upload API (User Story: US2)

- [ ] T004 [US2] Implement FileStorageService interface with methods saveFile({file, absenceReportId}) → {storagePath, fileName, mimeType} — writes to UPLOAD_DIR/absences/{absenceReportId}/{uuid}-{originalname}; deleteFile(storagePath) — fs.unlink the stored path; constructor reads UPLOAD_DIR from process.env; create upload directory on startup if not exists: backend/src/services/file-storage.service.ts
- [ ] T005 [US2] Implement Multer upload middleware: diskStorage with destination UPLOAD_DIR/tmp/, filename as uuid; fileFilter allowing only application/pdf, image/jpeg, image/png, image/heic (400 if rejected); limits.fileSize 15MB: backend/src/middleware/upload.ts
- [ ] T006 [US2] Implement POST /absences/:id/document (authenticateToken, apply Multer middleware from upload.ts, do NOT apply checkMonthLock per FR-025): verify absenceReport exists and belongs to req.user or actor is ADMIN (404/403); if existing AbsenceDocument exists call FileStorageService.deleteFile(existing.storagePath) and delete old AbsenceDocument record; call FileStorageService.saveFile, insert new AbsenceDocument; if absence status was DOCUMENT_PENDING set status SUBMITTED; return 200 {id, fileName, mimeType, uploadedAt}; DELETE /absences/:id/document (authenticateToken): delete AbsenceDocument record + file; if absence type is SICK_LEAVE or MILITARY_RESERVE set status back to DOCUMENT_PENDING; return 204: backend/src/routes/absences.ts (extend), backend/src/services/absence.service.ts (extend)

---

## Phase 3: Absence Form UI (User Story: US2)

- [ ] T007 [US2] Create React Query hooks for absences: useAbsences(userId, year, month) — GET /absences?userId=&year=&month=; useCreateAbsence — POST /absences; useUpdateAbsence — PATCH /absences/:id; useDeleteAbsence — DELETE /absences/:id; useUploadDocument — POST /absences/:id/document (multipart/form-data); useDeleteDocument — DELETE /absences/:id/document: frontend-time_management/src/services/absences.service.ts
- [ ] T008 [US2] Implement absence form page (Hebrew RTL, mobile-first): start-date input (type=date, Hebrew label "תאריך התחלה"), end-date input (type=date, Hebrew label "תאריך סיום"); absence type select with Hebrew options (חופשה / מחלה / מילואים / אחר); partial-day checkbox with Hebrew label "היעדרות חלקית" — when checked show notice "יש להגיש גם דיווח שעות לשארית היום"; live absence-day counter showing "X ימי היעדרות" recalculated client-side as user picks dates (iterate range, skip dayOfWeek 5+6); document-required badge "נדרש מסמך" shown for SICK_LEAVE and MILITARY_RESERVE type; React Hook Form + Zod (startDate required, endDate required, absenceType required); on submit calls useCreateAbsence, shows Hebrew success "ההיעדרות נשמרה" and reveals DocumentUpload component with the new absence id: frontend-time_management/src/pages/absences/AbsenceFormPage.tsx
- [ ] T009 [US2] Implement document upload widget rendered after absence is saved: file input accepting .pdf,.jpg,.jpeg,.png,.heic; on file select call useUploadDocument via FormData; show upload progress bar; on success show green "המסמך הועלה בהצלחה" and replace doc-required badge with "מסמך מצורף" badge; on error (413 too large) show Hebrew error "הקובץ גדול מדי (מקסימום 15MB)"; show "מחק מסמך" button that calls useDeleteDocument and reverts badge: frontend-time_management/src/pages/absences/components/DocumentUpload.tsx

---

## Dependencies

- T001 → T002 → T003: Sequential — service create → service update/list/delete → routes
- T004 ‖ T005: FileStorageService and Multer are independent files — write in parallel
- T006: Requires T003 (absence routes registered) + T004 + T005 (storage + multer ready)
- T007: Requires T003 + T006 (all endpoints running)
- T008: Requires T007 (hooks)
- T009: Requires T007 (useUploadDocument hook); can be written in parallel with T008

## Parallel Execution Guide

```
Dev 2 (Backend):
  T001 → T002 → T003   (sequential)
  T004 ‖ T005          (parallel: FileStorageService ‖ Multer middleware)
  T006                 (after T003 + T004 + T005)

Dev 4 (Frontend):
  T007                 (hooks — after endpoints running)
  T008 ‖ T009          (AbsenceFormPage ‖ DocumentUpload — parallel after T007)
```
