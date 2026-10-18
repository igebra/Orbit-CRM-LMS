import test from "node:test";
import assert from "node:assert/strict";
import { isCrmStaffRole, isAllowedCrmRoute } from "../app/lib/crmBoundary.mjs";

test("students parents trainers and unsupported roles cannot enter CRM", () => {
  for (const role of ["student","parent","trainer","", "other",null]) {
    assert.equal(isCrmStaffRole(role),false);
    for (const path of ["/dashboard","/crm/leads","/payments","/access","/students"]) {
      assert.equal(isAllowedCrmRoute(path,role),false,role+" "+path);
    }
  }
});
test("internal roles can enter CRM shell; module RLS remains separate",()=>{
  for(const role of ["super_admin","admin","sales","sales_marketing","marketing","accounts_finance","viewer_management"]) {
    assert.equal(isCrmStaffRole(role),true);
    assert.equal(isAllowedCrmRoute("/dashboard",role),true);
    assert.equal(isAllowedCrmRoute("/parent",role),false);
    assert.equal(isAllowedCrmRoute("/student",role),false);
    assert.equal(isAllowedCrmRoute("/portal-access",role),false);
    assert.equal(isAllowedCrmRoute("/lms",role),false);
    assert.equal(isAllowedCrmRoute("/not-a-route",role),false);
    assert.equal(isAllowedCrmRoute("/access",role),role==="super_admin");
  }
});
