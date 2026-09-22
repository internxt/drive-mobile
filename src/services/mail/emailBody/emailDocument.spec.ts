import { createHash } from 'crypto';

import { BLOCKED_REMOTE_IMAGE_MESSAGE, buildEmailDocument } from './emailDocument';

const aDocument = (bodyHtml: string, areRemoteImagesAllowed = false) =>
  buildEmailDocument(bodyHtml, {
    backgroundColor: 'rgb(255, 255, 255)',
    textColor: 'rgb(24, 24, 27)',
    areRemoteImagesAllowed,
  });

const rulesOf = (document: string): string => {
  const declaration = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(document);
  if (!declaration) throw new Error('the document does not declare rules the browser has to obey');
  return declaration[1];
};

describe('Preparing the body of an email to be displayed', () => {
  test('when a body is prepared, then it is placed inside the document', () => {
    expect(aDocument('<p>Hello there</p>')).toContain('<body><p>Hello there</p></body>');
  });

  test('when a body is prepared, then the rules it must obey are declared as rules for the browser', () => {
    expect(rulesOf(aDocument('<p>Hello there</p>'))).toContain('default-src \'none\'');
  });

  test('when a body is prepared, then those rules are declared before any content of the message', () => {
    const document = aDocument('<p>Hello there</p>');

    expect(document.indexOf('Content-Security-Policy')).toBeLessThan(document.indexOf('<body>'));
  });

  test('when a body is prepared, then it cannot submit anything anywhere or change where its links point to', () => {
    const rules = rulesOf(aDocument('<p>Hello there</p>'));

    expect(rules).toContain('form-action \'none\'');
    expect(rules).toContain('base-uri \'none\'');
  });

  test('when a body is prepared, then it cannot fetch fonts from elsewhere', () => {
    expect(rulesOf(aDocument('<p>Hello there</p>'))).toContain('font-src data:');
  });

  test('when the reader has not asked for images, then images hosted elsewhere cannot be fetched', () => {
    expect(rulesOf(aDocument('<img src="https://somewhere-else.example/pixel.gif" />'))).toContain('img-src data:');
  });

  test('when the reader asks to see the images, then images hosted elsewhere can be fetched', () => {
    const rules = rulesOf(aDocument('<img src="https://somewhere-else.example/hero.png" />', true));

    expect(rules).toContain('img-src https: data:');
  });

  test('when the styles of the message are applied, then they are allowed to apply', () => {
    const document = aDocument('<div style="color:#ff0000">An offer</div>');

    expect(rulesOf(document)).toContain('style-src \'unsafe-inline\'');
    expect(document).toContain('<div style="color:#ff0000">An offer</div>');
  });

  test('when the message does not set its own colours, then it is displayed in the colours of the app', () => {
    const document = aDocument('<p>Hello there</p>');

    expect(document).toContain('background: rgb(255, 255, 255)');
    expect(document).toContain('color: rgb(24, 24, 27)');
  });

  test('when a body is wider than the screen, then images are kept inside it', () => {
    expect(aDocument('<img src="https://example.com/hero.png" />')).toContain('max-width: 100%');
  });
});

const reporterScriptOf = (document: string): string => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(document);
  if (!script) throw new Error('the document does not report the images it blocks');
  return script[1];
};

const runReporterOf = (document: string) => {
  const violationListeners: ((violation: { effectiveDirective: string; blockedURI: string }) => void)[] = [];
  const messagesToTheApp: string[] = [];
  const pageDocument = {
    addEventListener: (_type: string, listener: (typeof violationListeners)[number]) =>
      violationListeners.push(listener),
  };
  const pageWindow = { ReactNativeWebView: { postMessage: (message: string) => messagesToTheApp.push(message) } };
  new Function('document', 'window', reporterScriptOf(document))(pageDocument, pageWindow);

  const blockLoading = (effectiveDirective: string, blockedURI: string) =>
    violationListeners.forEach((listener) => listener({ effectiveDirective, blockedURI }));

  return { blockLoading, messagesToTheApp };
};

describe('Telling the app that images of the message were blocked', () => {
  test('when an image hosted elsewhere is blocked, then the app is told', () => {
    const { blockLoading, messagesToTheApp } = runReporterOf(aDocument('<p>Hello there</p>'));

    blockLoading('img-src', 'https://somewhere-else.example/pixel.gif');

    expect(messagesToTheApp).toEqual([BLOCKED_REMOTE_IMAGE_MESSAGE]);
  });

  test('when several images are blocked, then the app is told only once', () => {
    const { blockLoading, messagesToTheApp } = runReporterOf(aDocument('<p>Hello there</p>'));

    blockLoading('img-src', 'https://somewhere-else.example/hero.png');
    blockLoading('img-src', 'https://somewhere-else.example/logo.png');

    expect(messagesToTheApp).toEqual([BLOCKED_REMOTE_IMAGE_MESSAGE]);
  });

  test('when an image embedded in the message is blocked, then the app is told as well', () => {
    const { blockLoading, messagesToTheApp } = runReporterOf(aDocument('<p>Hello there</p>'));

    blockLoading('img-src', 'cid');

    expect(messagesToTheApp).toEqual([BLOCKED_REMOTE_IMAGE_MESSAGE]);
  });

  test('when a font hosted elsewhere is blocked, then the app is not told', () => {
    const { blockLoading, messagesToTheApp } = runReporterOf(aDocument('<p>Hello there</p>'));

    blockLoading('font-src', 'https://somewhere-else.example/font.woff2');

    expect(messagesToTheApp).toEqual([]);
  });

  test('when a body is prepared, then what reports the blocked images starts before any content of the message', () => {
    const document = aDocument('<p>Hello there</p>');

    expect(document.indexOf('<script>')).toBeLessThan(document.indexOf('<body>'));
  });

  test('when a body is prepared, then the only script allowed to run is the one that reports the blocked images', () => {
    const document = aDocument('<p>Hello there</p>');
    const reporterScriptHash = createHash('sha256').update(reporterScriptOf(document), 'utf8').digest('base64');

    expect(rulesOf(document)).toContain(`script-src 'sha256-${reporterScriptHash}'`);
  });
});
