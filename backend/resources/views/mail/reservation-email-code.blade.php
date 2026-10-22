<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your email</title></head>
<body style="margin:0;background:#f7f3e9;color:#213547;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px">
        <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdfc;border:1px solid #d9e0e3;border-radius:12px">
                <tr><td style="padding:28px">
                    <h1 style="margin:0 0 16px;font-size:24px">Verify your email</h1>
                    <p>Enter this code in your Dinks on Us checkout to continue to payment:</p>
                    <p style="padding:20px;background:#eef4f4;color:#1e6f78;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center">{{ $code }}</p>
                    <p>This code expires in {{ $expiresInMinutes }} minutes. Do not share it with anyone.</p>
                    <p>Email verification does not hold court times or confirm a reservation. Staff reviews payment after you submit.</p>
                    <p style="color:#6b7a86">If you did not request this code, you can ignore this email.</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
