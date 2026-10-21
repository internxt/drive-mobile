import { classifyRecipients, getDomain, isInternxtDomain, uniqueEmailAddresses } from './mailDomain';

const activeDomains = [{ domain: 'internxt.com' }, { domain: 'inxt.me' }];

describe('Mail domain helpers', () => {
  test('when an address is written with spaces and capitals, then its domain is read in lowercase', () => {
    expect(getDomain('  Someone@Internxt.COM ')).toBe('internxt.com');
  });

  test('when a value is not a usable address, then it has no domain', () => {
    expect(getDomain('not-an-address')).toBeNull();
    expect(getDomain('@internxt.com')).toBeNull();
    expect(getDomain('someone@')).toBeNull();
  });

  test('when the address belongs to a domain the server serves, then it is recognised as internal', () => {
    expect(isInternxtDomain('someone@inxt.me', activeDomains)).toBe(true);
  });

  test('when the address belongs to any other domain, then it is not internal', () => {
    expect(isInternxtDomain('someone@gmail.com', activeDomains)).toBe(false);
  });

  test('when a domain merely ends with a served domain, then it is not internal', () => {
    expect(isInternxtDomain('victim@notinxt.me', activeDomains)).toBe(false);
  });

  test('when the address is on a subdomain of a served domain, then it is not internal', () => {
    expect(isInternxtDomain('someone@mail.inxt.me', activeDomains)).toBe(false);
  });

  test('when the same address is repeated with different capitalisation, then it is kept only once', () => {
    expect(uniqueEmailAddresses(['Someone@inxt.me', ' someone@INXT.me ', 'other@gmail.com'])).toEqual([
      'someone@inxt.me',
      'other@gmail.com',
    ]);
  });

  test('when every recipient is served by the mail server, then they are all classified as internal', () => {
    const result = classifyRecipients(['a@inxt.me', 'b@internxt.com'], activeDomains);

    expect(result.allInternxt).toBe(true);
    expect(result.external).toEqual([]);
  });

  test('when a single recipient is outside the served domains, then not all of them are internal', () => {
    const result = classifyRecipients(['a@inxt.me', 'b@gmail.com'], activeDomains);

    expect(result.allInternxt).toBe(false);
    expect(result.internxt).toEqual(['a@inxt.me']);
    expect(result.external).toEqual(['b@gmail.com']);
  });

  test('when there are no recipients at all, then they do not count as all internal', () => {
    expect(classifyRecipients([], activeDomains).allInternxt).toBe(false);
  });
});
