import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, title, company, email, phone, website, category } = body;

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "mariodvc@gmail.com",
      subject: "New Business Card Submission — Pending Review",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007550;">New Business Card Submission</h2>
          <p>A new business card has been submitted and is waiting for your review.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Name</td><td style="padding: 8px;">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding: 8px; font-weight: bold; color: #555;">Title</td><td style="padding: 8px;">${title}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Company</td><td style="padding: 8px;">${company}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Phone</td><td style="padding: 8px;">${phone}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding: 8px; font-weight: bold; color: #555;">Website</td><td style="padding: 8px;">${website}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Category</td><td style="padding: 8px;">${category}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="https://wk3bizcard.vercel.app/admin/submissions" 
               style="background: #007550; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold;">
              Review Submission →
            </a>
          </div>
          <p style="margin-top: 24px; color: #999; font-size: 12px;">
            This email was sent from your Business Card Directory app.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 },
    );
  }
}
