import { formatLogArgs } from './logger.service';

describe('Writing values to the log', () => {
  test('when a plain string is written, then it is kept unchanged', () => {
    expect(formatLogArgs(['Discovery failed'])).toBe('Discovery failed');
  });

  test('when several strings are written, then they are joined with a space', () => {
    expect(formatLogArgs(['Security check failed:', 'risk-a', 'risk-b'])).toBe('Security check failed: risk-a risk-b');
  });

  test('when a failure is written, then its message and the place it came from are kept', () => {
    const failure = new Error('database with name not found');

    const line = formatLogArgs([failure]);

    expect(line).toContain('database with name not found');
    expect(line).toContain(failure.stack);
  });

  test('when a failure is written, then its message appears once instead of twice', () => {
    const line = formatLogArgs([new Error('database with name not found')]);

    expect(line.split('database with name not found')).toHaveLength(2);
  });

  test('when a plain object is written, then its contents are readable instead of being collapsed', () => {
    expect(formatLogArgs([{ userId: '123', retryCount: 2 }])).toBe('{"userId":"123","retryCount":2}');
  });

  test('when a failure is written inside an object, then its message and the place it came from survive', () => {
    const line = formatLogArgs([{ error: new Error('too many SQL variables') }]);

    expect(line).toContain('too many SQL variables');
    expect(line).toContain('"stack"');
    expect(line).not.toBe('[object Object]');
  });

  test('when a list of objects is written, then it is kept as a list instead of one entry per item', () => {
    expect(formatLogArgs([[{ risk: 'a' }, { risk: 'b' }]])).toBe('[{"risk":"a"},{"risk":"b"}]');
  });

  test('when a value points back at itself, then the line is written instead of the call failing', () => {
    const circularValue: Record<string, unknown> = { name: 'device folder' };
    circularValue.self = circularValue;

    expect(() => formatLogArgs([circularValue])).not.toThrow();
    expect(formatLogArgs([circularValue])).toContain('"self":"[Circular]"');
  });

  test('when the same value is written twice under different names, then both are kept', () => {
    const sharedValue = { id: 7 };

    expect(formatLogArgs([{ first: sharedValue, second: sharedValue }])).toBe('{"first":{"id":7},"second":{"id":7}}');
  });

  test('when a date is written, then it is readable instead of empty', () => {
    expect(formatLogArgs([{ at: new Date('2026-09-08T10:00:00.000Z') }])).toBe('{"at":"2026-09-08T10:00:00.000Z"}');
  });

  test('when nothing is written, then the absence is visible instead of silent', () => {
    expect(formatLogArgs([undefined, null])).toBe('undefined null');
  });
});
