const verificationConfig = {
  GST: { requirement: "GST Registration", endpoint: "/verify-gst-document", submitted: "submitted_gstin", verified: "verified_gstin" },
  PAN: { requirement: "PAN", endpoint: "/verify-pan-document", submitted: "submitted_pan", verified: "verified_pan" },
  ITR: { requirement: "ITR", endpoint: "/verify-itr-document", submitted: "submitted_turnover", verified: "verified_turnover" },
  OEM_AUTHORIZATION: { requirement: "OEM Authorization", endpoint: "/verify-oem-document", submitted: "certificate_number", verified: "expiry_date" },
  LOCAL_CONTENT: { requirement: "Local Content", endpoint: "/verify-local-content-document", submitted: "submitted_percentage", verified: "required_percentage" },
  EXPERIENCE: { requirement: "Experience", endpoint: "/verify-experience-document", submitted: "submitted_years", verified: "required_years" },
  UDYAM: { requirement: "Udyam Registration", endpoint: "/verify-udyam-document", submitted: "registration_number", verified: "registration_number" },
  BLACKLIST: { requirement: "Blacklisting Status", endpoint: "/verify-blacklist", submitted: "company", verified: "blacklist_status" }
};
module.exports = { verificationConfig };
