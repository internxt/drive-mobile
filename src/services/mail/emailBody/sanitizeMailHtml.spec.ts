import { sanitizeMailHtml } from './sanitizeMailHtml';

describe('Cleaning the body of an incoming email', () => {
  test('when a message body contains a script tag, then it is not rendered', () => {
    const clean = sanitizeMailHtml('<p>Hello</p><script>stealTheKey()</script>');

    expect(clean).toBe('<p>Hello</p>');
  });

  test('when a message body contains a link with a javascript scheme, then the link is removed', () => {
    const clean = sanitizeMailHtml('<a href="javascript:stealTheKey()">Click here</a>');

    expect(clean).not.toContain('javascript');
    expect(clean).toContain('Click here');
  });

  test('when a message body contains an inline event handler, then the attribute is stripped', () => {
    const clean = sanitizeMailHtml('<div onclick="stealTheKey()">Some text</div>');

    expect(clean).toBe('<div>Some text</div>');
  });

  test('when a message body references an inline attachment, then the reference survives sanitising', () => {
    const clean = sanitizeMailHtml('<img src="cid:the-inline-image" alt="A signature" />');

    expect(clean).toContain('src="cid:the-inline-image"');
    expect(clean).toContain('alt="A signature"');
  });

  test('when a message body is styled, then the formatting is kept', () => {
    const clean = sanitizeMailHtml('<div style="color:#ff0000;font-size:20px;text-align:center">An offer</div>');

    expect(clean).toBe('<div style="color:#ff0000;font-size:20px;text-align:center">An offer</div>');
  });

  test('when a link is written to the sender, then it is kept', () => {
    const clean = sanitizeMailHtml('<a href="mailto:someone@inxt.me">Reply</a>');

    expect(clean).toContain('href="mailto:someone@inxt.me"');
  });

  test('when a link points to a website, then it is kept', () => {
    const clean = sanitizeMailHtml('<a href="https://internxt.com">Our website</a>');

    expect(clean).toContain('href="https://internxt.com"');
  });

  test('when the scheme of a link is hidden behind an encoded character, then the link is still removed', () => {
    const clean = sanitizeMailHtml('<a href="jav&#x09;ascript:stealTheKey()">Click here</a>');

    expect(clean).not.toContain('javascript');
    expect(clean).not.toContain('href');
  });

  test('when a link carries a document of its own, then it is removed', () => {
    const clean = sanitizeMailHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">Open</a>');

    expect(clean).not.toContain('data:');
  });

  test('when a link leaves out the scheme, then it is removed instead of guessed', () => {
    const clean = sanitizeMailHtml('<a href="//somewhere-else.example">Click here</a>');

    expect(clean).not.toContain('somewhere-else.example');
  });

  test('when a script hides inside a drawing, then nothing of it is rendered', () => {
    const clean = sanitizeMailHtml('<svg><script>stealTheKey()</script></svg>');

    expect(clean).not.toContain('stealTheKey');
  });

  test('when a message body asks for something to be filled in, then the form is removed', () => {
    const clean = sanitizeMailHtml('<form action="https://somewhere-else.example"><input name="password" /></form>');

    expect(clean).toBe('');
  });

  test('when a message body tries to change where relative links point to, then it is removed', () => {
    const clean = sanitizeMailHtml('<base href="https://somewhere-else.example/" />');

    expect(clean).toBe('');
  });

  test('when a message body embeds another page, then it is removed', () => {
    const clean = sanitizeMailHtml('<p>Before</p><iframe src="https://somewhere-else.example"></iframe>');

    expect(clean).toBe('<p>Before</p>');
  });

  test('when a message body is empty, then nothing is returned', () => {
    expect(sanitizeMailHtml('')).toBe('');
  });
});
