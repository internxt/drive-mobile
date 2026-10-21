export const BLOCKED_REMOTE_IMAGE_MESSAGE = 'blocked-remote-image';

const BLOCKED_REMOTE_IMAGE_REPORTER_SCRIPT = `
      (function () {
        var hasReported = false;
        document.addEventListener('securitypolicyviolation', function (event) {
          var directive = event.effectiveDirective || event.violatedDirective || '';
          if (hasReported || directive.indexOf('img-src') !== 0) {
            return;
          }
          hasReported = true;
          window.ReactNativeWebView.postMessage('${BLOCKED_REMOTE_IMAGE_MESSAGE}');
        });
      })();
    `;

const BLOCKED_REMOTE_IMAGE_REPORTER_SCRIPT_HASH = 'sha256-7edKHSWMOsg3Aauavz47/P/KjffAhfvDAAT5bORcF14=';

const buildContentSecurityPolicy = (areRemoteImagesAllowed: boolean): string =>
  [
    'default-src \'none\'',
    `script-src '${BLOCKED_REMOTE_IMAGE_REPORTER_SCRIPT_HASH}'`,
    areRemoteImagesAllowed ? 'img-src https: data:' : 'img-src data:',
    'style-src \'unsafe-inline\'',
    'font-src data:',
    'form-action \'none\'',
    'base-uri \'none\'',
  ].join('; ');

const buildDocumentStyles = (params: { backgroundColor: string; textColor: string }) => `
  html, body { margin: 0; padding: 0; background: ${params.backgroundColor}; }
  body {
    overflow: hidden;
    font-family: -apple-system, Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.4;
    color: ${params.textColor};
    word-break: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
`;

/**
 * Wraps the body of an email in the document that gets handed to the web view.
 *
 * @param bodyHtml the body of the email, already sanitised
 * @param params.backgroundColor the colour the message is displayed on
 * @param params.textColor the colour of the text the message does not style itself
 * @param params.areRemoteImagesAllowed whether images hosted outside the message may be fetched
 * @returns a full HTML document that renders the body and loads nothing the message is not allowed to
 */
export const buildEmailDocument = (
  bodyHtml: string,
  params: { backgroundColor: string; textColor: string; areRemoteImagesAllowed: boolean },
): string => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${buildContentSecurityPolicy(params.areRemoteImagesAllowed)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>${BLOCKED_REMOTE_IMAGE_REPORTER_SCRIPT}</script>
    <style>${buildDocumentStyles(params)}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
