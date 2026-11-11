// Run with: npm run test:research   (node --test, Node 22.6+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseDomain, normaliseEmail, isValidEmail, toE164, timezoneForState,
  totalScore, clampScores, derivePriority, parseCsv, csvToRecords, toCsv,
  mapImportRecord, planImport, renderTemplate, unresolvedMarkers, addBusinessDays,
  checkSendable, parseAllowedSenders, matchInbound, extractAddress, classifyByKeywords,
  dashboardMetrics, rootDomain, domainMatches, sequenceDueDates, inSendWindow, localTime,
  followupDecision, parseReturnDate, detectOptOut, suggestTemplate4,
} from "../lib/research-campaign/core.ts";

// ── Normalisation ───────────────────────────────────────────────────────
test("domains and e-mails normalise", () => {
  assert.equal(normaliseDomain("https://www.Salk.edu/about/"), "salk.edu");
  assert.equal(normaliseDomain("ki.mit.edu"), "ki.mit.edu");
  assert.equal(normaliseDomain("someone@fredhutch.org"), "fredhutch.org");
  assert.equal(normaliseDomain("not a url"), null);
  assert.equal(normaliseEmail("  MAILTO:Education@AllenInstitute.org "), "education@alleninstitute.org");
  assert.ok(isValidEmail("ggoode@fredhutch.org"));
  assert.ok(!isValidEmail("ggoode@fredhutch"));
  assert.ok(!isValidEmail("no tour email"));
  assert.equal(rootDomain("cumc.columbia.edu"), "columbia.edu");
  assert.ok(domainMatches("mail.salk.edu", "salk.edu"));
  assert.ok(!domainMatches("notsalk.edu", "salk.edu"));
});

test("phone numbers become E.164 or nothing", () => {
  assert.equal(toE164("+1 (206) 548-7055"), "+12065487055");
  assert.equal(toE164("206-548-7055"), "+12065487055");
  assert.equal(toE164("1-858-453-4100"), "+18584534100");
  assert.equal(toE164("ext. 12"), null);
  assert.equal(timezoneForState("wa"), "America/Los_Angeles");
  assert.equal(timezoneForState("ZZ"), null);
});

// ── Scoring ─────────────────────────────────────────────────────────────
test("scores clamp to the brief's weights and unknown counts as zero", () => {
  assert.deepEqual(clampScores({ score_outreach: 45, score_international: "x", score_contact: 5 }), {
    score_outreach: 30, score_international: 0, score_capacity: 0, score_relevance: 0,
    score_august: 0, score_cost: 0, score_contact: 5,
  });
  assert.equal(totalScore({ score_outreach: 30, score_international: 20, score_capacity: 15, score_relevance: 10, score_august: 10, score_cost: 10, score_contact: 5 }), 100);
});

test("an explicit exclusion is C whatever the score; A needs a verified channel", () => {
  assert.equal(derivePriority(95, true, true), "C");
  assert.equal(derivePriority(72, true, false), "A");
  assert.equal(derivePriority(72, false, false), "B");
  assert.equal(derivePriority(30, true, false), "C");
});

// ── CSV ─────────────────────────────────────────────────────────────────
test("CSV parser handles quotes, embedded commas, newlines, CRLF and BOM", () => {
  const rows = parseCsv('﻿a,b,c\r\n"x, y","he said ""hi""","multi\nline"\r\n,,\r\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x, y", 'he said "hi"', "multi\nline"]]);
});

test("CSV export escapes and neutralises formula injection", () => {
  const out = toCsv([{ a: "=HYPERLINK(1)", b: 'q"uote', c: null }], ["a", "b", "c"]);
  assert.equal(out, 'a,b,c\r\n\'=HYPERLINK(1),"q""uote",\r\n');
  const back = csvToRecords(out);
  assert.equal(back[0].b, 'q"uote');
});

// ── Import and dedup ────────────────────────────────────────────────────
const header = '"id","priority","score","cluster","institution","city","state","type","email","email_verification","phone_e164","named_contact","source_url","checked_on","previous_outreach"';
const csv = [
  header,
  '"US01","A","73","San Diego","Salk Institute","La Jolla","CA","Institute","communications@salk.edu","verified on official page (general)","+18584534100","","https://www.salk.edu/about/","2026-11-11","None"',
  '"US06","B","74","NY/NJ","CSHL DNA Learning Center","Cold Spring Harbor","NY","Centre","correri@cshl.edu ; budhram@cshl.edu","verified on official page (named)","+15163675171 ; +17182850389","Lauren Correri; Sarika Budhram","https://dnalc.cshl.edu/programs/fieldtrips/","2026-11-11",""',
  '"US99","B","50","X","Salk Institute for Biological Studies","La Jolla","CA","Institute","other@salk.edu","","","","https://salk.edu/","2026-11-11",""',
  '"US10","B","69","Chicago","Argonne","Lemont","IL","Lab","tours@anl.gov","UNVERIFIED (search excerpt; page 403)","","","https://www.anl.gov/tour-the-lab","2026-11-11",""',
  '"","","","","","","","","","","","","","",""',
].join("\n");

test("import maps the research file, splits multi-contact cells, never approves", () => {
  const recs = csvToRecords(csv);
  const row = mapImportRecord(recs[1], 3);
  assert.ok(!("error" in row));
  assert.equal(row.institution.domain, "dnalc.cshl.edu");
  assert.equal(row.contacts.length, 2);
  assert.equal(row.contacts[1].email, "budhram@cshl.edu");
  assert.equal(row.contacts[1].phone_e164, "+17182850389");
  assert.equal(row.contacts[1].person_name, "Sarika Budhram");
  assert.equal(row.contacts[0].verification, "verified_named");
  assert.equal(row.contacts[0].timezone, "America/New_York");
  assert.ok(row.contacts.every((c) => !("approved_for_contact" in c)));
  const argonne = mapImportRecord(recs[3], 5);
  assert.equal(argonne.contacts[0].verification, "unverified");
  assert.ok(argonne.warnings.some((w) => w.includes("total score")));
});

test("import deduplicates by domain within the file and against the database", () => {
  const recs = csvToRecords(csv);
  const plan = planImport(recs, [{ id: "inst-cshl", name: "Cold Spring Harbor DNALC", domain: "dnalc.cshl.edu" }], [
    { id: "c1", email: "correri@cshl.edu", institution_id: "inst-cshl" },
  ]);
  assert.equal(plan.creates.length, 2); // Salk, Argonne
  assert.equal(plan.updates.length, 1); // CSHL by domain
  assert.equal(plan.updates[0].id, "inst-cshl");
  assert.deepEqual(plan.duplicateRows.map((d) => d.line), [4]); // second Salk, same domain
  assert.deepEqual(plan.skippedContacts.map((s) => s.email), ["correri@cshl.edu"]);
  assert.equal(plan.errors.length, 0); // fully blank rows are dropped by the parser
  const named = planImport([{ institution: "", email: "a@b.org" }], [], []);
  assert.equal(named.errors.length, 1); // a row with data but no name is an error
});

test("the same e-mail under two institutions in one file is imported once", () => {
  const recs = csvToRecords([header,
    '"1","","","","Inst One","","","","shared@x.org","","","","https://one.org","",""',
    '"2","","","","Inst Two","","","","shared@x.org","","","","https://two.org","",""'].join("\n"));
  const plan = planImport(recs, [], []);
  assert.equal(plan.creates.length, 2);
  assert.equal(plan.creates[1].contacts.length, 0);
  assert.equal(plan.skippedContacts.length, 1);
});

// ── Templates ───────────────────────────────────────────────────────────
test("templates report missing values and leftover prompts", () => {
  const r = renderTemplate("Dear {{greeting}}, about {{programme}}{{clause}}.", { greeting: "Dr Goode", programme: null, clause: "" });
  assert.deepEqual(r.missing, ["programme"]);
  assert.equal(r.text, "Dear Dr Goode, about {{programme}}.");
  assert.deepEqual(unresolvedMarkers("Hi [Name], see {{x}}"), ["{{x}}", "[Name]"]);
});

// ── Business days ───────────────────────────────────────────────────────
test("business days skip weekends and US federal holidays", () => {
  // Fri 20 Nov 2026 + 7 business days: skips weekends and Thanksgiving (Thu 26 Nov) → Wed 2 Dec
  assert.equal(addBusinessDays(new Date("2026-11-20T10:00:00Z"), 7).toISOString().slice(0, 10), "2026-12-02");
  // Thu 24 Dec 2026 + 1 → Christmas Fri 25 closed → Mon 28 Dec
  assert.equal(addBusinessDays(new Date("2026-12-24T10:00:00Z"), 1).toISOString().slice(0, 10), "2026-12-28");
});

// ── Send gate ───────────────────────────────────────────────────────────
const okArgs = () => ({
  campaign: { status: "active", sending_enabled: true, sender_email: "olufemi.yusuf@bioergotech.org", daily_send_cap: 8, approved_at: "2026-11-20T10:00:00Z" },
  institution: { id: "i1", status: "approved", ineligible_reason: null },
  contact: { id: "c1", email: "ggoode@fredhutch.org", approved_for_contact: true, institution_id: "i1" },
  message: { id: "m1", direction: "outbound", state: "approved", approved_at: "2026-11-20T10:00:00Z", approved_by: "u1", subject: "Educational research visit enquiry", body: "Dear Dr Goode, ...", contact_id: "c1", institution_id: "i1" },
  suppressedEmails: new Set(), suppressedDomains: new Set(),
  allowedSenders: parseAllowedSenders("olufemi.yusuf@bioergotech.org, info@bioergotech.org"),
  sentToday: 0,
});

test("a fully approved message passes the gate", () => {
  assert.deepEqual(checkSendable(okArgs()), []);
});

test("nothing is sent without human approval", () => {
  for (const state of ["draft", "in_review", "sent", "cancelled", "sending"]) {
    const a = okArgs(); a.message.state = state;
    assert.ok(checkSendable(a).some((r) => r.includes("not approved")), state);
  }
  const a = okArgs(); a.message.approved_by = null;
  assert.ok(checkSendable(a).some((r) => r.includes("approver")));
  const b = okArgs(); b.contact.approved_for_contact = false;
  assert.ok(checkSendable(b).some((r) => r.includes("Contact not approved")));
  const c = okArgs(); c.campaign.sending_enabled = false;
  assert.ok(checkSendable(c).some((r) => r.includes("switched off")));
  const d = okArgs(); d.campaign.status = "draft"; d.campaign.approved_at = null;
  assert.ok(checkSendable(d).length >= 2);
});

test("only an authorised sender identity is accepted", () => {
  const a = okArgs(); a.campaign.sender_email = "guido@bioergotech.org";
  assert.ok(checkSendable(a).some((r) => r.includes("RC_ALLOWED_SENDERS")));
  const b = okArgs(); b.allowedSenders = parseAllowedSenders("");
  assert.ok(checkSendable(b).some((r) => r.includes("RC_ALLOWED_SENDERS")));
});

test("suppressed addresses and domains, closed institutions and caps block sending", () => {
  const a = okArgs(); a.suppressedEmails = new Set(["ggoode@fredhutch.org"]);
  assert.ok(checkSendable(a).some((r) => r.includes("suppression")));
  const b = okArgs(); b.suppressedDomains = new Set(["fredhutch.org"]);
  assert.ok(checkSendable(b).some((r) => r.includes("Domain")));
  const c = okArgs(); c.institution.status = "declined";
  assert.ok(checkSendable(c).some((r) => r.includes("declined")));
  const d = okArgs(); d.sentToday = 8;
  assert.ok(checkSendable(d).some((r) => r.includes("cap")));
  const e = okArgs(); e.message.body = "Dear [Name/Team], hello";
  assert.ok(checkSendable(e).some((r) => r.includes("placeholders")));
  const f = okArgs(); f.contact.institution_id = "other";
  assert.ok(checkSendable(f).some((r) => r.includes("another institution")));
});

// ── Reply matching ──────────────────────────────────────────────────────
const outbound = [
  { id: "m1", institution_id: "i1", contact_id: "c1", rfc_message_id: "<abc@bioergotech.org>", thread_id: "T1", to_email: "ggoode@fredhutch.org" },
  { id: "m2", institution_id: "i2", contact_id: "c2", rfc_message_id: "<def@bioergotech.org>", thread_id: null, to_email: "pacec@mit.edu" },
];
const insts = [{ id: "i1", domain: "fredhutch.org" }, { id: "i2", domain: "ki.mit.edu" }, { id: "i3", domain: "salk.edu" }];
const contacts = [{ id: "c1", institution_id: "i1", email: "ggoode@fredhutch.org" }, { id: "c2", institution_id: "i2", email: "pacec@mit.edu" }];

test("replies match by thread, then headers, then address, then domain", () => {
  assert.equal(matchInbound({ from: "x@y.org", threadId: "T1" }, outbound, insts, contacts).method, "thread");
  const h = matchInbound({ from: "Someone <a@b.com>", inReplyTo: "<DEF@bioergotech.org>" }, outbound, insts, contacts);
  assert.equal(h.method, "header"); assert.equal(h.institution_id, "i2");
  assert.equal(matchInbound({ from: "Gennifer Goode <GGoode@fredhutch.org>" }, outbound, insts, contacts).method, "address");
  const d = matchInbound({ from: "colleague@mit.edu" }, outbound, insts, contacts);
  assert.equal(d.method, "domain"); assert.equal(d.institution_id, "i2"); assert.equal(d.needsReview, true);
});

test("unknown senders and never-contacted institutions are not matched", () => {
  assert.equal(matchInbound({ from: "news@example.com" }, outbound, insts, contacts).matched, false);
  assert.equal(matchInbound({ from: "press@salk.edu" }, outbound, insts, contacts).matched, false);
  assert.equal(extractAddress('"Goode, Gennifer" <ggoode@fredhutch.org>'), "ggoode@fredhutch.org");
});

// ── Classification (12 classes of the brief) ────────────────────────────
test("keyword classifier covers the brief's reply classes", () => {
  assert.equal(classifyByKeywords("I am out of the office until Monday, November 30."), "out_of_office");
  assert.equal(classifyByKeywords("This is an automatic reply: we have received your message."), "auto_ack");
  assert.equal(classifyByKeywords("Our programme is only open to US citizens."), "not_eligible");
  assert.equal(classifyByKeywords("Unfortunately we do not host visiting student groups."), "not_interested");
  assert.equal(classifyByKeywords("Please remove me from your list."), "not_interested");
  assert.equal(classifyByKeywords("The fee is $400 per group."), "fee_request");
  assert.equal(classifyByKeywords("Could we schedule a Zoom call next week"), "meeting_requested");
  assert.equal(classifyByKeywords("I have forwarded your message to our education office."), "referred");
  assert.equal(classifyByKeywords("Thanks for writing. I'm not sure who handles this kind of request here."), "requests_coordinator");
  assert.equal(classifyByKeywords("How many students and which dates?"), "more_info");
  assert.equal(classifyByKeywords("We would be happy to host your group."), "interested");
  assert.equal(classifyByKeywords("Thanks."), "unclear");
});

test("opt-out wording is detected", () => {
  assert.ok(detectOptOut("Please do not contact us again."));
  assert.ok(detectOptOut("Kindly remove me / unsubscribe."));
  assert.ok(!detectOptOut("We would be happy to discuss."));
});

test("out-of-office return dates are read, with the right year", () => {
  const nov = new Date("2026-11-20T10:00:00Z");
  assert.equal(parseReturnDate("I will be back on Monday, November 30.", nov), "2026-11-30");
  assert.equal(parseReturnDate("Returning 4 January", nov), "2027-01-04");
  assert.equal(parseReturnDate("I am away until 12/02 with limited access", nov), "2026-12-02");
  assert.equal(parseReturnDate("Back 2026-12-07.", nov), "2026-12-07");
  assert.equal(parseReturnDate("I am out of the office.", nov), null);
});

test("Template 4 is suggested only when nobody responsible is named", () => {
  assert.equal(suggestTemplate4("requests_coordinator", false, "Not my area."), true);
  assert.equal(suggestTemplate4("interested", false, "Sounds interesting, happy to help."), true);
  assert.equal(suggestTemplate4("interested", true, "Sounds interesting."), false); // respondent is the coordinator
  assert.equal(suggestTemplate4("interested", false, "Please contact Dr. Smith at smith@salk.edu."), false);
  assert.equal(suggestTemplate4("meeting_requested", false, "Can we meet?"), false);
  assert.equal(suggestTemplate4("referred", false, "Forwarded to outreach."), false);
});

// ── Follow-up schedule: Day 3 and Day 7 from the INITIAL e-mail ─────────
const sched = { schedule_mode: "business", followup1_days: 3, followup2_days: 7, no_response_after_days: 3 };

test("Day 3 and Day 7 count from the initial e-mail, in business days", () => {
  // Monday 7 Dec 2026 → Day 3 Thu 10 Dec, Day 7 Wed 16 Dec (not 7 days after the reminder)
  const d = sequenceDueDates("2026-12-07T17:00:00Z", sched);
  assert.equal(d.followup1.toISOString().slice(0, 10), "2026-12-10");
  assert.equal(d.followup2.toISOString().slice(0, 10), "2026-12-16");
  assert.equal(d.noResponse.toISOString().slice(0, 10), "2026-12-21");
  // Over Thanksgiving: Mon 23 Nov → Day 3 skips Thu 26 → Fri 27; Day 7 → Thu 3 Dec
  const t = sequenceDueDates("2026-11-23T17:00:00Z", sched);
  assert.equal(t.followup1.toISOString().slice(0, 10), "2026-11-27");
  assert.equal(t.followup2.toISOString().slice(0, 10), "2026-12-03");
});

test("calendar-day mode is available", () => {
  const d = sequenceDueDates("2026-12-11T17:00:00Z", { ...sched, schedule_mode: "calendar" }); // Friday
  assert.equal(d.followup1.toISOString().slice(0, 10), "2026-12-14");
  assert.equal(d.followup2.toISOString().slice(0, 10), "2026-12-18");
});

test("the 17:00 UTC daily run is inside business hours in every continental US zone, winter and summer", () => {
  for (const day of ["2027-01-13T17:00:00Z", "2027-07-14T17:00:00Z"]) {
    for (const tz of ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles"]) {
      assert.ok(inSendWindow(tz, new Date(day), 8, 17), `${tz} ${day}`);
    }
  }
  assert.equal(inSendWindow("America/Los_Angeles", new Date("2027-01-13T03:00:00Z"), 8, 17), false); // 19:00 the evening before
  assert.equal(inSendWindow("America/New_York", new Date("2027-01-16T17:00:00Z"), 8, 17), false); // Saturday
  assert.equal(inSendWindow(null, new Date("2027-01-13T17:00:00Z"), 8, 17), true); // unknown zone → Eastern
  assert.deepEqual(localTime("America/Chicago", new Date("2027-07-14T17:00:00Z")).hour, 12);
});

test("follow-ups stop on any meaningful reply, continue on automatic messages, wait for out-of-office", () => {
  const today = new Date("2026-12-10T17:00:00Z");
  assert.deepEqual(followupDecision({ inboundSinceInitial: [], today }), { action: "send" });
  assert.deepEqual(followupDecision({ inboundSinceInitial: [{ label: "auto_ack", return_date: null }], today }), { action: "send" });
  for (const label of ["interested", "more_info", "meeting_requested", "fee_request", "referred", "requests_coordinator", "not_eligible", "not_interested", "unclear"]) {
    assert.equal(followupDecision({ inboundSinceInitial: [{ label, return_date: null }], today }).action, "cancel", label);
  }
  assert.equal(followupDecision({ inboundSinceInitial: [{ label: null, return_date: null }], today }).action, "cancel");
  const ooo = followupDecision({ inboundSinceInitial: [{ label: "out_of_office", return_date: "2026-12-14" }], today });
  assert.deepEqual(ooo, { action: "postpone", until: "2026-12-15" });
  assert.deepEqual(followupDecision({ inboundSinceInitial: [{ label: "out_of_office", return_date: "2026-12-01" }], today }), { action: "send" });
  assert.deepEqual(followupDecision({ inboundSinceInitial: [{ label: "out_of_office", return_date: null }], today }), { action: "send" });
});

test("follow-ups are blocked by pauses and once the conversation has moved on", () => {
  const base = okArgs();
  base.message.step = "followup1";
  base.institution.status = "contacted";
  assert.deepEqual(checkSendable(base), []);
  const a = okArgs(); a.message.step = "followup2"; a.institution.status = "responded";
  assert.ok(checkSendable(a).some((r) => r.includes("Follow-ups stop")));
  const b = okArgs(); b.message.step = "followup1"; b.institution.status = "contacted"; b.institution.followups_paused = true;
  assert.ok(checkSendable(b).some((r) => r.includes("paused for this institution")));
  const c = okArgs(); c.message.step = "followup1"; c.institution.status = "contacted"; c.contact.followups_paused = true;
  assert.ok(checkSendable(c).some((r) => r.includes("paused for this contact")));
  const d = okArgs(); d.institution.status = "no_response";
  assert.ok(checkSendable(d).some((r) => r.includes("no_response")));
  const e = okArgs(); e.message.historical = true;
  assert.ok(checkSendable(e).some((r) => r.includes("Not a sendable")));
});

// ── Dashboard ───────────────────────────────────────────────────────────
test("dashboard counts institutions, not messages, and ignores earlier correspondence", () => {
  const m = dashboardMetrics(
    [
      { id: "i1", status: "qualified", priority: "A", next_action_due: "2026-12-01" },
      { id: "i2", status: "contacted", priority: "B", next_action_due: null },
      { id: "i3", status: "confirmed", priority: "A", next_action_due: "2026-01-01" },
      { id: "i4", status: "negotiating", priority: null, next_action_due: null },
      { id: "i5", status: "no_response", priority: "B", next_action_due: null },
      { id: "i6", status: "discovered", priority: "C", next_action_due: null },
    ],
    [
      { verification: "verified_named", approved_for_contact: true, institution_id: "i1" },
      { verification: "provided_by_institution", approved_for_contact: false, institution_id: "i1", referred_by_contact_id: "x" },
      { verification: "verified_department", approved_for_contact: true, institution_id: "i3" },
    ],
    [
      { direction: "outbound", state: "sent", step: "initial", delivery_status: "delivered", institution_id: "i1" },
      { direction: "outbound", state: "sent", step: "initial", delivery_status: "bounced", institution_id: "i2" },
      { direction: "outbound", state: "approved", step: "followup1", delivery_status: null, institution_id: "i5" },
      { direction: "outbound", state: "draft", step: "initial", delivery_status: null, institution_id: "i6" },
      { direction: "inbound", state: "received", step: "inbound", delivery_status: null, institution_id: "i1" },
      { direction: "inbound", state: "received", step: "inbound", delivery_status: null, institution_id: "i1" },
      { direction: "inbound", state: "received", step: "inbound", delivery_status: null, institution_id: "i4", historical: true },
      { direction: "outbound", state: "sent", step: "custom", delivery_status: null, institution_id: "i4", historical: true },
    ],
    [
      { message_institution_id: "i1", label: "interested", confirmed: true },
      { message_institution_id: "i1", label: "fee_request", confirmed: false },
    ],
    [{ status: "open", task_type: "call", due_date: null }, { status: "done", task_type: "reply", due_date: null }],
    new Date("2026-12-05T00:00:00Z"),
  );
  assert.equal(m.institutionsDiscovered, 6);
  assert.equal(m.verified, 5);
  assert.equal(m.approved, 5);
  assert.equal(m.emailsSent, 2); // historical not counted
  assert.equal(m.bounced, 1);
  assert.equal(m.repliesReceived, 1); // i4's reply is earlier correspondence
  assert.equal(m.positiveResponses, 1);
  assert.equal(m.referrals, 1);
  assert.equal(m.feesRequested, 1);
  assert.equal(m.negotiating, 1);
  assert.equal(m.confirmed, 1);
  assert.equal(m.noResponse, 1);
  assert.equal(m.outstandingActions, 1);
  assert.equal(m.followupsQueued, 1);
  assert.equal(m.draftsAwaitingReview, 1);
  assert.equal(m.overdueActions, 1);
});

// ── Campaign facts: only those the templates use are required ───────────
test("only facts used by the templates are required", async () => {
  const { factsUsed } = await import("../lib/research-campaign/templates.ts");
  assert.deepEqual(factsUsed([{ subject: "x", body: "aged {{age_range}} with {{ chaperone }}" }]), ["age_range", "chaperone"]);
  assert.deepEqual(factsUsed([{ subject: "x", body: "five Italian high school students" }]), []);
});
