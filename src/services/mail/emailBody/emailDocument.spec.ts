import { buildEmailDocument } from './emailDocument';

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
