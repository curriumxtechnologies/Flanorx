import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (to, otp, subject = "Email Verification OTP") => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Fuel <fuel@flanorx.com>",   // <-- using your provided email
      to: [to],
      subject,
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Email sending failed");
  }
};