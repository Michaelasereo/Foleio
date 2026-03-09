import { emailSignature } from './signature';

export function baseEmailTemplate({
  previewText,
  body,
}: {
  previewText: string;
  body: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Foleio</title>
      </head>
      <body style="margin:0;padding:0;background-color:#F5F0E8;font-family:DM Sans,Helvetica,Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;color:#F5F0E8;font-size:1px;line-height:1px;">
          ${previewText}
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0E8;padding:40px 16px;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
                <tr>
                  <td style="padding:40px;">
                    ${body}
                    ${emailSignature()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
