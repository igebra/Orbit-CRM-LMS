/** CRM Student phone input: preserve the existing single full-phone database field.
 * The dial code is editable (default +91), never inferred from the phone digits.
 */
export const DEFAULT_STUDENT_DIAL_CODE = "+91";

export function normalizeDialCode(code) {
  const clean=String(code??"").trim().replace(/[\s()-]/g,"");
  if(!/^\+?\d{1,4}$/.test(clean))return null;
  return "+"+clean.replace(/^\+/,"");
}

export function formatStudentPhone(countryCode,number) {
  const local=String(number??"").trim();
  if(!local) return {value:null,error:null};
  const code=normalizeDialCode(countryCode);
  if(!code) return {value:null,error:"Enter a valid country code, such as +91 or +971."};
  if(/\+/.test(local) || /[^0-9 ()-]/.test(local)) {
    return {value:null,error:"Enter only the local phone number here. Use the separate country-code field."};
  }
  const digits=local.replace(/\D/g,"");
  if(digits.length<4 || digits.length>15){
    return {value:null,error:"Enter a valid phone number (4–15 digits) without the country code."};
  }
  return {value:`${code} ${digits}`,error:null};
}
