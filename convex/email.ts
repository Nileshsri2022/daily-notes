import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendBudgetAlert = action({
  args: {
    to: v.string(),
    type: v.union(
      v.literal("warning_80"),
      v.literal("breach_100"),
      v.literal("cycle_wrapup")
    ),
    budgetAmount: v.number(),
    spentAmount: v.number(),
    daysLeft: v.number(),
    durationDays: v.number(),
    overrun: v.optional(v.number()),
    safeDailySpend: v.optional(v.number()),
  },
  handler: async (
    _ctx,
    {
      to,
      type,
      budgetAmount,
      spentAmount,
      daysLeft,
      durationDays,
      overrun,
      safeDailySpend,
    }
  ) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "[Resend] RESEND_API_KEY is not configured in environment. Skipping email dispatch."
      );
      return { success: false, reason: "missing_api_key" };
    }

    let subject = "";
    let headline = "";
    let bodySnippet = "";
    const percentage = Math.round((spentAmount / budgetAmount) * 100);

    if (type === "warning_80") {
      subject = `⚠️ Dincharya: 80% of your ₹${budgetAmount.toFixed(0)} budget reached`;
      headline = "⚠️ Approaching Budget Limit";
      bodySnippet = `
        <p style="font-size: 15px; color: #374151; line-height: 1.5;">
          You have spent <b>₹${spentAmount.toFixed(2)}</b> (<b>${percentage}%</b>) of your <b>₹${budgetAmount.toFixed(2)}</b> budget for this ${durationDays}-day cycle.
        </p>
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400E;">
            ⏳ <b>${daysLeft} days remaining</b>. Recommended pace: <b>₹${(safeDailySpend || 0).toFixed(2)} / day</b> to stay within limit.
          </p>
        </div>
      `;
    } else if (type === "breach_100") {
      subject = `🚨 Dincharya: 100% Budget limit reached!`;
      headline = "🚨 Budget Limit Reached";
      bodySnippet = `
        <p style="font-size: 15px; color: #374151; line-height: 1.5;">
          You have reached <b>₹${spentAmount.toFixed(2)}</b> (<b>${percentage}%</b>) of your <b>₹${budgetAmount.toFixed(2)}</b> budget with <b>${daysLeft} days remaining</b>.
        </p>
        <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #B91C1C;">
            🛑 Any further spending in this cycle will count as a budget overrun.
          </p>
        </div>
      `;
    } else {
      // cycle_wrapup
      const isOver = (overrun || 0) > 0;
      subject = isOver
        ? `📊 Dincharya: Your ${durationDays}-day cycle finished (+₹${(overrun || 0).toFixed(0)} overrun)`
        : `🎉 Dincharya: Your ${durationDays}-day cycle finished (₹${Math.abs(overrun || 0).toFixed(0)} saved!)`;
      headline = `📊 ${durationDays}-Day Cycle Completed`;
      bodySnippet = `
        <p style="font-size: 15px; color: #374151; line-height: 1.5;">
          Your ${durationDays}-day budget cycle has completed. Here is your summary:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 0; color: #6B7280;">Target Budget:</td>
            <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111827;">₹${budgetAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 0; color: #6B7280;">Total Spent:</td>
            <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111827;">₹${spentAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${isOver ? "#DC2626" : "#059669"}; font-weight: 600;">
              ${isOver ? "Budget Overrun:" : "Surplus Saved:"}
            </td>
            <td style="padding: 8px 0; font-weight: 800; text-align: right; color: ${isOver ? "#DC2626" : "#059669"};">
              ${isOver ? `+₹${(overrun || 0).toFixed(2)}` : `-₹${Math.abs(overrun || 0).toFixed(2)}`}
            </td>
          </tr>
        </table>
        <div style="background-color: #F3F4F6; padding: 12px; margin: 16px 0; border-radius: 6px; font-size: 13px; color: #4B5563;">
          ℹ️ Your next ${durationDays}-day cycle has automatically started with the same budget target. You can adjust your budget at any time in the app.
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; margin: 0; padding: 24px;">
          <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 16px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #111827;">Dincharya</h1>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #6B7280;">Daily Notes & Financial Clarity</p>
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">${headline}</h2>
            ${bodySnippet}
            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #F3F4F6; text-align: center;">
              <a href="http://localhost:8081" style="display: inline-block; background-color: #111827; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px;">
                Open Dincharya Dashboard
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Dincharya Alerts <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Resend] Failed to send email:", errorText);
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      console.error("[Resend] Network error:", err);
      return { success: false, error: String(err) };
    }
  },
});
