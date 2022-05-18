import * as Sentry from 'sentry-expo';
import sentryTestkit from 'sentry-testkit';
const { testkit, sentryTransport } = sentryTestkit();

beforeAll(() => {
  Sentry.init({
    enableInExpoDevelopment: true,
    transport: sentryTransport,
  });
});

test('Collect error events', function () {
  // TODO: captureException
  expect(testkit.reports()).toHaveLength(0);
});

test('Collect performance events', function () {
  // TODO: startTransaction
  expect(testkit.transactions()).toHaveLength(0);
});
