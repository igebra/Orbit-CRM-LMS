import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const access=readFileSync(new URL("../app/access/page.tsx",import.meta.url),"utf8");
const accessCss=readFileSync(new URL("../app/access/access.module.css",import.meta.url),"utf8");
const courses=readFileSync(new URL("../app/courses/page.tsx",import.meta.url),"utf8");
const signup=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
test("Access Actions heading stays horizontal with scrollable wide table",()=>{
 assert.match(accessCss,/\.tableWrap th:last-child,\.tableWrap td:last-child/);
 assert.match(accessCss,/min-width:1370px!important/);
 assert.match(accessCss,/white-space:nowrap!important/);
 assert.match(accessCss,/\.floatingScrollbar\{position:fixed/);
 assert.match(access,/floatingScroll\.visible/);
 assert.match(access,/tableScrollRef/);
});
test("CRM Course catalogue has no Edit Course actions or modal",()=>{
 assert.doesNotMatch(courses,/Edit Course|openEditCourse|saveCourseDetails|setEditCourse/);
 assert.match(courses,/View Course Details/);
 assert.match(courses,/View Official Course Page/);
});
test("International phone entry validates before account creation and is not tied to India",()=>{
 assert.match(signup,/setRequestCountryCode/);
 assert.match(signup,/\+1/);
 assert.match(signup,/nationalDigits/);
 assert.ok(signup.indexOf("const countryCode = requestCountryCode.trim()")<signup.indexOf("supabase.auth.signUp"));
 assert.match(signup,/supabase\.auth\.signInWithPassword/);
});
