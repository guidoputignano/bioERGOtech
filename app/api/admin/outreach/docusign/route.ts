import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import fs from "fs";
import path from "path";

// ── Get a fresh DocuSign access token using the stored refresh token ──────────
async function getDocuSignToken(): Promise<string> {
  const clientId     = process.env.DOCUSIGN_CLIENT_ID!;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET!;
  const refreshToken = process.env.DOCUSIGN_REFRESH_TOKEN!;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("DocuSign credentials not configured. Visit /api/auth/docusign to connect.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://account-d.docusign.com/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`DocuSign token error: ${data.error_description}`);
  return data.access_token;
}

// POST /api/admin/outreach/docusign
// Body: { contactId: string, signerEmail: string, signerName: string }
// Generates MoU DOCX and sends to DocuSign for e-signature
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { contactId, signerEmail, signerName } = await req.json();

    if (!contactId || !signerEmail || !signerName) {
      return NextResponse.json(
        { error: "contactId, signerEmail, and signerName are required" },
        { status: 400 }
      );
    }

    const db = client;

    // Load contact
    const { data: contact, error: fetchError } = await db
      .from("outreach_contacts")
      .select("id, name, country, type, field_of_interest, contact_person, email, category, notes")
      .eq("id", contactId)
      .single();

    if (fetchError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Generate MoU document via internal API
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org";
    const mouRes  = await fetch(`${siteUrl}/api/admin/outreach/mou?contactId=${contactId}`);
    if (!mouRes.ok) {
      return NextResponse.json({ error: "Failed to generate MoU document" }, { status: 500 });
    }

    const mouBuffer = await mouRes.arrayBuffer();
    const mouBase64 = Buffer.from(mouBuffer).toString("base64");
    const docName   = `bioERGOtech_MoU_${(contact.name || "Partner").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.docx`;

    // Get DocuSign token
    const accessToken = await getDocuSignToken();
    const accountId   = process.env.DOCUSIGN_ACCOUNT_ID!;
    const baseUri     = process.env.DOCUSIGN_BASE_URI || "https://demo.docusign.net";

    // Create DocuSign envelope
    const envelope = {
      emailSubject: `MoU — bioERGOtech × ${(contact.name || "Partner").slice(0, 60)}`.slice(0, 100),
      emailBlurb: `Dear ${signerName},\n\nPlease find attached the draft Memorandum of Understanding from the bioERGOtech Foundation. You can review and sign the document electronically using the link below.\n\nIf you have any questions, please contact Guido Putignano at info@bioergotech.org.\n\nWith warm regards,\nGuido Putignano\nPresident, bioERGOtech Foundation`,
      documents: [{
        documentBase64: mouBase64,
        name: docName,
        fileExtension: "docx",
        documentId: "1",
      }],
      recipients: {
        signers: [{
          email:        signerEmail,
          name:         signerName,
          recipientId:  "1",
          routingOrder: "1",
          tabs: {
            signHereTabs: [{
              anchorString:  "Date:  ",
              anchorUnits:   "pixels",
              anchorXOffset: "60",
              anchorYOffset: "-10",
              anchorIgnoreIfNotPresent: "true",
            }],
            dateSignedTabs: [{
              anchorString:  "Date:  ",
              anchorUnits:   "pixels",
              anchorXOffset: "60",
              anchorYOffset: "10",
              anchorIgnoreIfNotPresent: "true",
            }],
          },
        }],
        carbonCopies: [{
          email:        "info@bioergotech.org",
          name:         "Guido Putignano — bioERGOtech",
          recipientId:  "2",
          routingOrder: "2",
        }],
      },
      status: "sent",
    };

    const dsRes = await fetch(`${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(envelope),
    });

    const dsData = await dsRes.json();
    if (!dsRes.ok) {
      return NextResponse.json(
        { error: `DocuSign error: ${dsData.message || dsData.errorCode}` },
        { status: 500 }
      );
    }

    // Update contact MoU status + store envelope ID
    await db.from("outreach_contacts").update({
      mou_status: "MoU Sent",
      email_status: "MoU Sent",
      notes: [contact.notes || "", `[DocuSign] Envelope sent ${new Date().toLocaleDateString("en-GB")} — ID: ${dsData.envelopeId} — Signer: ${signerEmail}`]
        .filter(Boolean).join("\n"),
    }).eq("id", contactId);

    return NextResponse.json({
      success:    true,
      envelopeId: dsData.envelopeId,
      status:     dsData.status,
      message:    `MoU sent to ${signerEmail} for e-signature via DocuSign`,
    });

  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DocuSign send failed" },
      { status: 500 }
    );
  }
}

// GET /api/admin/outreach/docusign?envelopeId=xxx
// Check the status of a DocuSign envelope
export async function GET(req: NextRequest) {
  // Nessuna scrittura qui: la guardia serve solo a chiudere la rotta.
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const envelopeId = searchParams.get("envelopeId");

  if (!envelopeId) {
    return NextResponse.json({ error: "envelopeId required" }, { status: 400 });
  }

  try {
    const accessToken = await getDocuSignToken();
    const accountId   = process.env.DOCUSIGN_ACCOUNT_ID!;
    const baseUri     = process.env.DOCUSIGN_BASE_URI || "https://demo.docusign.net";

    const res = await fetch(
      `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );

    const data = await res.json();
    return NextResponse.json({ envelopeId, status: data.status, completedDateTime: data.completedDateTime });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Status check failed" }, { status: 500 });
  }
}
