export type LegalContactInfo = {
  companyName: string;
  legalForm: string;
  managingDirector: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  vatId: string;
  commercialRegisterCourt: string;
  commercialRegisterNumber: string;
  responsibleForContent: string;
  dataProtectionContactName: string;
  dataProtectionContactEmail: string;
  dataProtectionContactAddress: string;
};

// IMPORTANT:
// Replace these placeholder values with your real legal company data
// before going live.
export const LEGAL_CONTACT: LegalContactInfo = {
  companyName: "Musterfirma GmbH",
  legalForm: "GmbH",
  managingDirector: "Max Mustermann",
  street: "MusterstraBe 1",
  postalCode: "10115",
  city: "Berlin",
  country: "Deutschland",
  phone: "+49 30 12345678",
  email: "info@musterfirma.de",
  website: "https://www.musterfirma.de",
  vatId: "DE123456789",
  commercialRegisterCourt: "Amtsgericht Berlin-Charlottenburg",
  commercialRegisterNumber: "HRB 123456 B",
  responsibleForContent: "Max Mustermann",
  dataProtectionContactName: "Datenschutzbeauftragte/r",
  dataProtectionContactEmail: "datenschutz@musterfirma.de",
  dataProtectionContactAddress: "MusterstraBe 1, 10115 Berlin, Deutschland",
};

