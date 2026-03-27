/** Compliance frameworks available for workflow and ERP generation. */
export const COMPLIANCE_OPTIONS = [
  "FERPA",
  "GDPR",
  "HIPAA",
  "SOC2",
  "PCI-DSS",
  "ISO27001",
  "DPDP",
  "CCPA",
] as const;

export type ComplianceTag = (typeof COMPLIANCE_OPTIONS)[number];
