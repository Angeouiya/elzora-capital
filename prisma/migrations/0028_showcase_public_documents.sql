-- Dossiers fictifs de démonstration accessibles sans compte depuis les offres publiques.
-- Les fichiers sont versionnés avec l'application et clairement identifiés comme fictifs.

INSERT OR REPLACE INTO "ProjectDocument" (
  "id", "projectId", "type", "fileName", "fileUrl", "storageKey",
  "contentType", "size", "checksum", "isPublic", "uploadedAt"
) VALUES
  (
    'showcase-doc-sunu-pdf', 'showcase-project-sunu', 'pitch_deck', 'Note de présentation.pdf',
    '/demo-documents/sunu-energie/note-de-presentation.pdf', NULL,
    'application/pdf', 3061, '4DBB6FE0FE7F93DDB724D4F04857A44566D60536DC8F058F621037FE9208D555', 1,
    '2026-09-25T10:00:00.000Z'
  ),
  (
    'showcase-doc-sunu-docx', 'showcase-project-sunu', 'impact_evidence', 'Résumé du projet.docx',
    '/demo-documents/sunu-energie/resume-du-projet.docx', NULL,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 38481,
    '256C4BBF98C7ACF0C3FF4E0D1A5717433C8935B8073FBEECCA69DBF3D534392E', 1,
    '2026-09-25T10:01:00.000Z'
  ),
  (
    'showcase-doc-sunu-xlsx', 'showcase-project-sunu', 'financial_forecast', 'Prévisions financières.xlsx',
    '/demo-documents/sunu-energie/previsions-financieres.xlsx', NULL,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 4687,
    'A71F9BAB5D57D8C1199370083CDA7716F7A2A78A0AEE0785BBB828404D8F4A00', 1,
    '2026-09-25T10:02:00.000Z'
  ),
  (
    'showcase-doc-naya-pdf', 'showcase-project-naya', 'pitch_deck', 'Note de présentation.pdf',
    '/demo-documents/naya-logistique/note-de-presentation.pdf', NULL,
    'application/pdf', 3083, '318A91C5FDAE66CC075600CDEFECADB8783B402F16A934DFE722C57659B795DC', 1,
    '2026-09-25T10:03:00.000Z'
  ),
  (
    'showcase-doc-naya-docx', 'showcase-project-naya', 'impact_evidence', 'Résumé du projet.docx',
    '/demo-documents/naya-logistique/resume-du-projet.docx', NULL,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 38482,
    'FBAFAF3D9B9F347BB60E6471B0C484F33CC60C664B2607EDFD41D0101ED7446E', 1,
    '2026-09-25T10:04:00.000Z'
  ),
  (
    'showcase-doc-naya-xlsx', 'showcase-project-naya', 'financial_forecast', 'Prévisions financières.xlsx',
    '/demo-documents/naya-logistique/previsions-financieres.xlsx', NULL,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 4707,
    '4983FD14422514BAC78BB2DE2867FDAF25E707C33450DF0F4B67F40A20B90FD6', 1,
    '2026-09-25T10:05:00.000Z'
  ),
  (
    'showcase-doc-kora-pdf', 'showcase-project-kora', 'pitch_deck', 'Note de présentation.pdf',
    '/demo-documents/kora-sante/note-de-presentation.pdf', NULL,
    'application/pdf', 3049, '779CE1E78DBDCE704D580475C22A4652989D941BAAC0EC2518A5415A7E332F65', 1,
    '2026-09-25T10:06:00.000Z'
  ),
  (
    'showcase-doc-kora-docx', 'showcase-project-kora', 'impact_evidence', 'Résumé du projet.docx',
    '/demo-documents/kora-sante/resume-du-projet.docx', NULL,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 38465,
    'B8B8D0412F7BD275EC8121AF02634DD2E477AC0B9C48ED8EB047B79168E15E76', 1,
    '2026-09-25T10:07:00.000Z'
  ),
  (
    'showcase-doc-kora-xlsx', 'showcase-project-kora', 'financial_forecast', 'Prévisions financières.xlsx',
    '/demo-documents/kora-sante/previsions-financieres.xlsx', NULL,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 4691,
    '8954EF19F4A52521BA50440BCBB1ED840EB7AB5C084743F8CF9234BFA816C98D', 1,
    '2026-09-25T10:08:00.000Z'
  );
